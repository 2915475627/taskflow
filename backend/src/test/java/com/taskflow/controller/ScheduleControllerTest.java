package com.taskflow.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.taskflow.dto.ScheduleCreateRequest;
import com.taskflow.dto.ScheduleResponse;
import com.taskflow.exception.ResourceNotFoundException;
import com.taskflow.exception.ValidationException;
import com.taskflow.security.TenantContext;
import com.taskflow.service.ScheduleService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc(addFilters = false)
class ScheduleControllerTest {

    private static final Long TENANT_ID = 1L;
    private static final Long WORKFLOW_ID = 100L;
    private static final Long SCHEDULE_ID = 1L;

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private ScheduleService scheduleService;

    @BeforeEach
    void setUp() {
        TenantContext.setCurrentTenantId(TENANT_ID);
    }

    @AfterEach
    void tearDown() {
        TenantContext.clear();
    }

    @Test
    void createSchedule_shouldCreateSchedule() throws Exception {
        ScheduleCreateRequest request = new ScheduleCreateRequest(
                "0 0 * * * *",
                "UTC",
                "Daily schedule",
                null
        );

        ScheduleResponse response = new ScheduleResponse(
                SCHEDULE_ID,
                WORKFLOW_ID,
                "Test Workflow",
                "0 0 * * * *",
                "UTC",
                true,
                "Daily schedule",
                null,
                null,
                Instant.now()
        );

        when(scheduleService.createSchedule(eq(WORKFLOW_ID), any())).thenReturn(response);

        mockMvc.perform(post("/api/workflows/{workflowId}/schedules", WORKFLOW_ID)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.workflowId").value(WORKFLOW_ID))
                .andExpect(jsonPath("$.data.cronExpression").value("0 0 * * * *"));
    }

    @Test
    void getSchedule_shouldReturnSchedule() throws Exception {
        ScheduleResponse response = new ScheduleResponse(
                SCHEDULE_ID,
                WORKFLOW_ID,
                "Test Workflow",
                "0 0 * * * *",
                "UTC",
                true,
                "Daily schedule",
                null,
                null,
                Instant.now()
        );

        when(scheduleService.getSchedule(SCHEDULE_ID)).thenReturn(response);

        mockMvc.perform(get("/api/schedules/{scheduleId}", SCHEDULE_ID)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.id").value(SCHEDULE_ID));
    }

    @Test
    void getSchedule_shouldReturn404_whenNotFound() throws Exception {
        when(scheduleService.getSchedule(SCHEDULE_ID))
                .thenThrow(new ResourceNotFoundException("Schedule not found: " + SCHEDULE_ID));

        mockMvc.perform(get("/api/schedules/{scheduleId}", SCHEDULE_ID)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    void listSchedules_shouldReturnAllSchedules() throws Exception {
        List<ScheduleResponse> responses = List.of(
                new ScheduleResponse(
                        1L, WORKFLOW_ID, "Workflow 1", "0 0 * * * *",
                        "UTC", true, "Schedule 1", null, null, Instant.now()),
                new ScheduleResponse(
                        2L, WORKFLOW_ID, "Workflow 2", "0 0 9 * * *",
                        "UTC", true, "Schedule 2", null, null, Instant.now())
        );

        when(scheduleService.listSchedules()).thenReturn(responses);

        mockMvc.perform(get("/api/schedules")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.length()").value(2));
    }

    @Test
    void updateSchedule_shouldUpdateSchedule() throws Exception {
        ScheduleCreateRequest request = new ScheduleCreateRequest(
                "0 0 9 * * *",
                "Asia/Shanghai",
                "Updated schedule",
                null
        );

        ScheduleResponse response = new ScheduleResponse(
                SCHEDULE_ID,
                WORKFLOW_ID,
                "Test Workflow",
                "0 0 9 * * *",
                "Asia/Shanghai",
                true,
                "Updated schedule",
                null,
                null,
                Instant.now()
        );

        when(scheduleService.updateSchedule(eq(SCHEDULE_ID), any())).thenReturn(response);

        mockMvc.perform(put("/api/schedules/{scheduleId}", SCHEDULE_ID)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.cronExpression").value("0 0 9 * * *"))
                .andExpect(jsonPath("$.data.timezone").value("Asia/Shanghai"));
    }

    @Test
    void setScheduleEnabled_shouldEnableSchedule() throws Exception {
        ScheduleResponse response = new ScheduleResponse(
                SCHEDULE_ID,
                WORKFLOW_ID,
                "Test Workflow",
                "0 0 * * * *",
                "UTC",
                true,
                "Daily schedule",
                null,
                null,
                Instant.now()
        );

        when(scheduleService.setScheduleEnabled(SCHEDULE_ID, true)).thenReturn(response);

        mockMvc.perform(patch("/api/schedules/{scheduleId}/enabled", SCHEDULE_ID)
                        .param("enabled", "true")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.enabled").value(true));
    }

    @Test
    void deleteSchedule_shouldDeleteSchedule() throws Exception {
        doNothing().when(scheduleService).deleteSchedule(SCHEDULE_ID);

        mockMvc.perform(delete("/api/schedules/{scheduleId}", SCHEDULE_ID)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isNoContent());

        verify(scheduleService).deleteSchedule(SCHEDULE_ID);
    }

    @Test
    void createSchedule_shouldReturn400_whenInvalidCron() throws Exception {
        ScheduleCreateRequest request = new ScheduleCreateRequest(
                "invalid cron",
                "UTC",
                "Invalid schedule",
                null
        );

        when(scheduleService.createSchedule(eq(WORKFLOW_ID), any()))
                .thenThrow(new ValidationException("Invalid cron expression"));

        mockMvc.perform(post("/api/workflows/{workflowId}/schedules", WORKFLOW_ID)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));
    }
}