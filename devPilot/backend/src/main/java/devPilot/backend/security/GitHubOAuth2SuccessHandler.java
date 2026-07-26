package devPilot.backend.security;

import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.client.OAuth2AuthorizedClient;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.client.web.OAuth2AuthorizedClientRepository;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.stereotype.Component;

import devPilot.backend.entity.User;
import devPilot.backend.service.UserService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Component
@RequiredArgsConstructor
@Slf4j
public class GitHubOAuth2SuccessHandler implements AuthenticationSuccessHandler {

    private final UserService userService;
    private final OAuth2AuthorizedClientRepository authorizedClientRepository;
    private final SecurityContextRepository securityContextRepository =
            new HttpSessionSecurityContextRepository();

    @Value("${app.frontend-url}")
    private String frontendUrl;

    @Override
    public void onAuthenticationSuccess(
            HttpServletRequest request,
            HttpServletResponse response,
            Authentication authentication) throws IOException {

        try {
            if (!(authentication instanceof OAuth2AuthenticationToken oauthToken)) {
                redirectError(response, "auth");
                return;
            }

            OAuth2AuthorizedClient client = authorizedClientRepository.loadAuthorizedClient(
                    oauthToken.getAuthorizedClientRegistrationId(),
                    oauthToken,
                    request);

            if (client == null || client.getAccessToken() == null) {
                log.warn("GitHub OAuth succeeded but no access token was available");
                redirectError(response, "token");
                return;
            }

            OAuth2User oauth2User = oauthToken.getPrincipal();
            Map<String, Object> attributes = oauth2User.getAttributes();
            String accessToken = client.getAccessToken().getTokenValue();
            String scopes = client.getAccessToken().getScopes() != null
                    ? String.join(",", client.getAccessToken().getScopes())
                    : "read:user,repo";

            User user = userService.upsertFromGitHub(attributes, accessToken, scopes);
            AppUserPrincipal principal = new AppUserPrincipal(user, attributes);

            OAuth2AuthenticationToken newAuth = new OAuth2AuthenticationToken(
                    principal,
                    principal.getAuthorities(),
                    oauthToken.getAuthorizedClientRegistrationId());

            SecurityContext context = SecurityContextHolder.createEmptyContext();
            context.setAuthentication(newAuth);
            SecurityContextHolder.setContext(context);
            securityContextRepository.saveContext(context, request, response);

            // Land on a frontend callback that sets the Next.js auth cookie, then goes to dashboard
            response.sendRedirect(frontendUrl + "/auth/callback");
        } catch (Exception ex) {
            log.error("GitHub OAuth success handling failed", ex);
            redirectError(response, "server");
        }
    }

    private void redirectError(HttpServletResponse response, String code) throws IOException {
        response.sendRedirect(frontendUrl + "/login?error="
                + URLEncoder.encode(code, StandardCharsets.UTF_8));
    }
}
