package com.pharmacy.controller;

import com.pharmacy.entity.Medicine;
import com.pharmacy.entity.PurchaseOrder;
import com.pharmacy.entity.SalesInvoice;
import com.pharmacy.repository.*;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class DashboardController {

    private final MedicineRepository medicineRepository;
    private final SalesInvoiceRepository salesInvoiceRepository;
    private final PurchaseOrderRepository purchaseOrderRepository;
    private final CustomerRepository customerRepository;
    private final SupplierRepository supplierRepository;

    public DashboardController(MedicineRepository medicineRepository,
                              SalesInvoiceRepository salesInvoiceRepository,
                              PurchaseOrderRepository purchaseOrderRepository,
                              CustomerRepository customerRepository,
                              SupplierRepository supplierRepository) {
        this.medicineRepository = medicineRepository;
        this.salesInvoiceRepository = salesInvoiceRepository;
        this.purchaseOrderRepository = purchaseOrderRepository;
        this.customerRepository = customerRepository;
        this.supplierRepository = supplierRepository;
    }

    @GetMapping("/dashboard/summary")
    public Map<String, Object> summary() {
        List<Medicine> medicines = medicineRepository.findAll();
        BigDecimal stockValue = medicines.stream()
                .map(m -> m.getUnitPrice().multiply(BigDecimal.valueOf(m.getQuantityInStock())))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        long lowStock = medicines.stream()
                .filter(m -> m.getQuantityInStock() <= m.getReorderLevel())
                .count();

        BigDecimal revenue = salesInvoiceRepository.findAll().stream()
                .map(SalesInvoice::getTotalAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal purchaseSpend = purchaseOrderRepository.findAll().stream()
                .map(PurchaseOrder::getTotalAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        Map<String, Object> summary = new HashMap<>();
        summary.put("totalMedicines", medicines.size());
        summary.put("customers", customerRepository.count());
        summary.put("suppliers", supplierRepository.count());
        summary.put("lowStockAlerts", lowStock);
        summary.put("inventoryValue", stockValue);
        summary.put("monthlyRevenue", revenue);
        summary.put("monthlyPurchases", purchaseSpend);
        summary.put("lowStockItems", medicines.stream().filter(m -> m.getQuantityInStock() <= m.getReorderLevel()).toList());
        return summary;
    }
}
