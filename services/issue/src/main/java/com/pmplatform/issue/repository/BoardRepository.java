package com.pmplatform.issue.repository;

import com.pmplatform.issue.domain.Board;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * Repository cho boards.
 */
public interface BoardRepository extends JpaRepository<Board, Long> {

    List<Board> findByProjectId(Long projectId);
}
