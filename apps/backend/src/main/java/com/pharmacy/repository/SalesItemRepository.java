package com.pharmacy.repository;

import com.pharmacy.entity.SalesItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SalesItemRepository extends JpaRepository<SalesItem, Long> {
    List<SalesItem> findBySalesInvoiceId(Long salesInvoiceId);
}
