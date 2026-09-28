package com.leavemanager.repository;

import com.leavemanager.domain.User;
import com.leavemanager.domain.enums.Role;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmail(String email);

    List<User> findByManagerId(Long managerId);

    List<User> findByRole(Role role);

    List<User> findByTeamId(Long teamId);

    boolean existsByEmail(String email);
}
