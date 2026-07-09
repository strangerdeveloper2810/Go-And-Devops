package com.pmplatform.issue;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * issue-service (module 3) — Jira core của PM Platform.
 * HTTP 8003, gRPC 9003 (phase sau), schema Postgres `issue`, consume
 * workspace.events + auth.user.events, produce issue.events.
 */
@SpringBootApplication
public class IssueApplication {
    public static void main(String[] args) {
        SpringApplication.run(IssueApplication.class, args);
    }
}
