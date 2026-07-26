package devPilot.backend;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

import io.github.cdimascio.dotenv.Dotenv;

@SpringBootApplication
@EnableAsync
public class BackendApplication {

	public static void main(String[] args) {
		loadDotEnv();
		SpringApplication.run(BackendApplication.class, args);
	}

	private static void loadDotEnv() {
		Path cwd = Paths.get(System.getProperty("user.dir")).toAbsolutePath().normalize();
		Path envDir = resolveEnvDirectory(cwd);

		Dotenv dotenv = Dotenv.configure()
				.directory(envDir.toString())
				.ignoreIfMissing()
				.load();
		dotenv.entries().forEach(e -> System.setProperty(e.getKey(), e.getValue()));
	}

	private static Path resolveEnvDirectory(Path cwd) {
		if (Files.exists(cwd.resolve(".env"))) {
			return cwd;
		}
		Path backendDir = cwd.resolve("backend");
		if (Files.exists(backendDir.resolve(".env"))) {
			return backendDir;
		}
		return cwd;
	}

}
