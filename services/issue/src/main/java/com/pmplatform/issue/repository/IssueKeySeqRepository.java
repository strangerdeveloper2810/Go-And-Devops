package com.pmplatform.issue.repository;

import com.pmplatform.issue.domain.IssueKeySeq;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * Repository cho issue_key_seq (bộ đếm key per-project).
 * Việc cấp key nguyên tử (UPSERT + RETURNING) sẽ làm ở KeyAllocator phase sau.
 */
public interface IssueKeySeqRepository extends JpaRepository<IssueKeySeq, Long> {
}
