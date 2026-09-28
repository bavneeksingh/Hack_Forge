package com.leavemanager;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class LeaveManagerApplication {

    public static void main(String[] args) {
        SpringApplication.run(LeaveManagerApplication.class, args);
    }
}
