package com.leavemanager.service;

import com.leavemanager.domain.PublicHoliday;
import com.leavemanager.repository.PublicHolidayRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class WorkingDayServiceTest {

    @Mock
    private PublicHolidayRepository publicHolidayRepository;

    @InjectMocks
    private WorkingDayService workingDayService;

    @BeforeEach
    void setUp() {
        org.mockito.Mockito.lenient()
                .when(publicHolidayRepository.findByDateBetween(any(), any())).thenReturn(List.of());
    }

    @Test
    void countWorkingDays_fullWeek_returns5() {
        // Mon 2026-10-05 to Fri 2026-10-09
        int count = workingDayService.countWorkingDays(
                LocalDate.of(2026, 10, 5), LocalDate.of(2026, 10, 9));
        assertThat(count).isEqualTo(5);
    }

    @Test
    void countWorkingDays_includesWeekend_skipsIt() {
        // Mon 2026-10-05 to Sun 2026-10-11 (Mon-Fri = 5 working days)
        int count = workingDayService.countWorkingDays(
                LocalDate.of(2026, 10, 5), LocalDate.of(2026, 10, 11));
        assertThat(count).isEqualTo(5);
    }

    @Test
    void countWorkingDays_twoWeeks_returns10() {
        // Mon 2026-10-05 to Fri 2026-10-16
        int count = workingDayService.countWorkingDays(
                LocalDate.of(2026, 10, 5), LocalDate.of(2026, 10, 16));
        assertThat(count).isEqualTo(10);
    }

    @Test
    void countWorkingDays_singleDay_weekday_returns1() {
        int count = workingDayService.countWorkingDays(
                LocalDate.of(2026, 10, 5), LocalDate.of(2026, 10, 5));
        assertThat(count).isEqualTo(1);
    }

    @Test
    void countWorkingDays_singleDay_weekend_returns0() {
        // Saturday
        int count = workingDayService.countWorkingDays(
                LocalDate.of(2026, 10, 10), LocalDate.of(2026, 10, 10));
        assertThat(count).isEqualTo(0);
    }

    @Test
    void countWorkingDays_excludesPublicHoliday() {
        // Wed 2026-10-07 is a holiday
        PublicHoliday holiday = new PublicHoliday(LocalDate.of(2026, 10, 7), "Test Holiday");
        when(publicHolidayRepository.findByDateBetween(any(), any())).thenReturn(List.of(holiday));

        int count = workingDayService.countWorkingDays(
                LocalDate.of(2026, 10, 5), LocalDate.of(2026, 10, 9));
        assertThat(count).isEqualTo(4); // 5 - 1 holiday
    }

    @Test
    void countWorkingDays_holidayOnWeekend_noDoubleDeduction() {
        // Sat 2026-10-10 is a holiday (but already excluded as weekend)
        PublicHoliday holiday = new PublicHoliday(LocalDate.of(2026, 10, 10), "Weekend Holiday");
        when(publicHolidayRepository.findByDateBetween(any(), any())).thenReturn(List.of(holiday));

        int count = workingDayService.countWorkingDays(
                LocalDate.of(2026, 10, 5), LocalDate.of(2026, 10, 11));
        assertThat(count).isEqualTo(5); // Weekdays: Mon-Fri = 5, holiday on Sat doesn't affect
    }

    @Test
    void countWorkingDays_startAfterEnd_throws() {
        assertThatThrownBy(() -> workingDayService.countWorkingDays(
                LocalDate.of(2026, 10, 10), LocalDate.of(2026, 10, 5)))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void getWorkingDaysInRange_returnsCorrectDates() {
        List<LocalDate> days = workingDayService.getWorkingDaysInRange(
                LocalDate.of(2026, 10, 5), LocalDate.of(2026, 10, 9));

        assertThat(days).containsExactly(
                LocalDate.of(2026, 10, 5),
                LocalDate.of(2026, 10, 6),
                LocalDate.of(2026, 10, 7),
                LocalDate.of(2026, 10, 8),
                LocalDate.of(2026, 10, 9)
        );
    }
}
