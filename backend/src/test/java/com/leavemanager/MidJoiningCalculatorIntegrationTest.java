package com.leavemanager;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("demo")
public class MidJoiningCalculatorIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    private String hrToken;
    private String employeeToken;

    @BeforeEach
    void setUp() throws Exception {
        // Login Helen HR
        String hrLogin = "{\"email\":\"hr.helen@company.com\",\"password\":\"password123\"}";
        MvcResult hrResult = mockMvc.perform(post("/api/auth/login")
                        .contextPath("/api")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(hrLogin))
                .andExpect(status().isOk())
                .andReturn();

        JsonNode hrNode = objectMapper.readTree(hrResult.getResponse().getContentAsString());
        hrToken = hrNode.get("token").asText();

        // Login Frank Employee
        String empLogin = "{\"email\":\"frank@company.com\",\"password\":\"password123\"}";
        MvcResult empResult = mockMvc.perform(post("/api/auth/login")
                        .contextPath("/api")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(empLogin))
                .andExpect(status().isOk())
                .andReturn();

        JsonNode empNode = objectMapper.readTree(empResult.getResponse().getContentAsString());
        employeeToken = empNode.get("token").asText();
    }

    @Test
    void previewCalculation_unauthenticated_fails() throws Exception {
        mockMvc.perform(get("/api/calculator/preview")
                        .contextPath("/api")
                        .param("joinDate", "2026-07-01")
                        .param("year", "2026"))
                .andExpect(status().isForbidden());
    }

    @Test
    void previewCalculation_employee_isForbidden() throws Exception {
        mockMvc.perform(get("/api/calculator/preview")
                        .contextPath("/api")
                        .header("Authorization", "Bearer " + employeeToken)
                        .param("joinDate", "2026-07-01")
                        .param("year", "2026"))
                .andExpect(status().isForbidden());
    }

    @Test
    void previewCalculation_hrOrManager_returnsProRatedValues() throws Exception {
        mockMvc.perform(get("/api/calculator/preview")
                        .contextPath("/api")
                        .header("Authorization", "Bearer " + hrToken)
                        .param("joinDate", "2026-07-01")
                        .param("year", "2026"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.year", is(2026)))
                .andExpect(jsonPath("$.remainingMonths", is(6)))
                .andExpect(jsonPath("$.totalAnnualDays", is(41.0)))
                .andExpect(jsonPath("$.totalProRatedDays", is(20.5)))
                .andExpect(jsonPath("$.totalAdjustedDays", is(-20.5)))
                .andExpect(jsonPath("$.calculations", hasSize(3)))
                .andExpect(jsonPath("$.calculations[0].leaveTypeName", is("Annual Leave")))
                .andExpect(jsonPath("$.calculations[0].proRatedEntitlement", is(12.0)));
    }

    @Test
    void getOrganizationUsers_hr_returnsAllRoles() throws Exception {
        mockMvc.perform(get("/api/calculator/users")
                        .contextPath("/api")
                        .header("Authorization", "Bearer " + hrToken)
                        .param("year", "2026"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", not(empty())))
                // Verify users with EMPLOYEE, MANAGER, and HR roles are all present
                .andExpect(jsonPath("$[*].role", hasItems("EMPLOYEE", "MANAGER", "HR")));
    }

    @Test
    void adjustUserBalances_hrCanAdjustEmployeeBalances() throws Exception {
        // Adjust Frank's join date and balances
        String adjustPayload = """
                {
                    "userId": 6,
                    "joinDate": "2026-07-01",
                    "year": 2026,
                    "leaveTypeEntitlements": {
                        "1": 12.0,
                        "2": 6.0,
                        "3": 2.5
                    },
                    "comment": "HR pro-rated calibration"
                }
                """;

        mockMvc.perform(post("/api/calculator/adjust")
                        .contextPath("/api")
                        .header("Authorization", "Bearer " + hrToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(adjustPayload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id", is(6)))
                .andExpect(jsonPath("$.joinDate", is("2026-07-01")));
    }

    @Test
    void recalibrateAll_hr_succeeds() throws Exception {
        mockMvc.perform(post("/api/calculator/recalibrate-all")
                        .contextPath("/api")
                        .header("Authorization", "Bearer " + hrToken)
                        .param("year", "2026"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.year", is(2026)))
                .andExpect(jsonPath("$.usersAdjusted", greaterThanOrEqualTo(1)));
    }
}
