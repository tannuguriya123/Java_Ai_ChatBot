package devPilot.backend.security;

import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.authentication.AuthenticationFailureHandler;
import org.springframework.stereotype.Component;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;

@Component
@Slf4j
public class GitHubOAuth2FailureHandler implements AuthenticationFailureHandler {

    @Value("${app.frontend-url}")
    private String frontendUrl;

    @Override
    public void onAuthenticationFailure(
            HttpServletRequest request,
            HttpServletResponse response,
            AuthenticationException exception) throws IOException {
        log.warn("GitHub OAuth failed: {}", exception.getMessage());
        String code = exception.getMessage() != null && exception.getMessage().length() <= 60
                ? exception.getMessage()
                : "oauth_failed";
        response.sendRedirect(frontendUrl + "/login?error="
                + URLEncoder.encode(code, StandardCharsets.UTF_8));
    }
}
