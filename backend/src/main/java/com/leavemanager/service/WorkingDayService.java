package com.leavemanager.service;

import com.leavemanager.domain.PublicHoliday;
import com.leavemanager.repository.PublicHolidayRepository;
import org.springframework.stereotype.Service;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Calculates working days (Mon-Fri) excluding public holidays.
 * Half-days are out of scope.
 */
@Service
public class WorkingDayService {

    private final PublicHolidayRepository publicHolidayRepository;

    public WorkingDayService(PublicHolidayRepository publicHolidayRepository) {
        this.publicHolidayRepository = publicHolidayRepository;
    }

    /**
     * Count working days between start and end (inclusive).
     */
    public int countWorkingDays(LocalDate start, LocalDate end) {
        return getWorkingDaysInRange(start, end).size();
    }

    /**
     * Return list of working dates between start and end (inclusive).
     * Excludes weekends (Sat, Sun) and public holidays.
     */
    public List<LocalDate> getWorkingDaysInRange(LocalDate start, LocalDate end) {
        if (start.isAfter(end)) {
            throw new IllegalArgumentException("Start date must not be after end date");
        }

        Set<LocalDate> holidays = getHolidayDates(start, end);
        List<LocalDate> workingDays = new ArrayList<>();

        LocalDate current = start;
        while (!current.isAfter(end)) {
            if (isWorkingDay(current) && !holidays.contains(current)) {
                workingDays.add(current);
            }
            current = current.plusDays(1);
        }

        return workingDays;
    }

    /**
     * Get holidays falling in the given date range.
     */
    public List<PublicHoliday> getPublicHolidaysInRange(LocalDate start, LocalDate end) {
        return publicHolidayRepository.findByDateBetween(start, end);
    }

    public List<LocalDate> getHolidaysInRange(LocalDate start, LocalDate end) {
        return publicHolidayRepository.findByDateBetween(start, end)
                .stream()
                .map(PublicHoliday::getDate)
                .collect(Collectors.toList());
    }

    private boolean isWorkingDay(LocalDate date) {
        DayOfWeek day = date.getDayOfWeek();
        return day != DayOfWeek.SATURDAY && day != DayOfWeek.SUNDAY;
    }

    private Set<LocalDate> getHolidayDates(LocalDate start, LocalDate end) {
        return publicHolidayRepository.findByDateBetween(start, end)
                .stream()
                .map(PublicHoliday::getDate)
                .collect(Collectors.toSet());
    }
}
