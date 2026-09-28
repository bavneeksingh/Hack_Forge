package com.leavemanager.repository;

import com.leavemanager.domain.PublicHoliday;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface PublicHolidayRepository extends JpaRepository<PublicHoliday, Long> {

    List<PublicHoliday> findByYear(int year);

    List<PublicHoliday> findByDateBetween(LocalDate start, LocalDate end);
}
