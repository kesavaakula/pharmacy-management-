package com.pharmacy.controller;

import com.pharmacy.entity.*;
import com.pharmacy.repository.*;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@RestController
@RequestMapping("/api")
public class PurchaseController {

    private final PurchaseOrderRepository purchaseOrderRepository;
    private final PurchaseOrderItemRepository purchaseOrderItemRepository;
    private final MedicineRepository medicineRepository;
    private final SupplierRepository supplierRepository;

    public PurchaseController(PurchaseOrderRepository purchaseOrderRepository,
                             PurchaseOrderItemRepository purchaseOrderItemRepository,
                             MedicineRepository medicineRepository,
                             SupplierRepository supplierRepository) {
        this.purchaseOrderRepository = purchaseOrderRepository;
        this.purchaseOrderItemRepository = purchaseOrderItemRepository;
        this.medicineRepository = medicineRepository;
        this.supplierRepository = supplierRepository;
    }

    @GetMapping("/purchases")
    public List<PurchaseOrder> listPurchaseOrders() {
        return purchaseOrderRepository.findAll();
    }

    @PostMapping("/purchases")
    public ResponseEntity<PurchaseOrder> createPurchase(@RequestBody PurchaseRequest request) {
        Supplier supplier = supplierRepository.findById(request.supplierId())
                .orElseThrow(() -> new IllegalArgumentException("Supplier not found"));

        PurchaseOrder order = new PurchaseOrder();
        order.setSupplierId(supplier.getId());
        order.setStatus("APPROVED");

        PurchaseOrder savedOrder = purchaseOrderRepository.save(order);
        BigDecimal totalAmount = BigDecimal.ZERO;

        for (PurchaseLine line : request.items()) {
            Medicine medicine = medicineRepository.findById(line.medicineId())
                    .orElseThrow(() -> new IllegalArgumentException("Medicine not found: " + line.medicineId()));

            BigDecimal lineTotal = line.unitPrice().multiply(BigDecimal.valueOf(line.quantity()));
            totalAmount = totalAmount.add(lineTotal);

            PurchaseOrderItem item = new PurchaseOrderItem();
            item.setPurchaseOrderId(savedOrder.getId());
            item.setMedicineId(medicine.getId());
            item.setQuantity(line.quantity());
            item.setUnitPrice(line.unitPrice());
            item.setTotalAmount(lineTotal);
            purchaseOrderItemRepository.save(item);

            medicine.setQuantityInStock(medicine.getQuantityInStock() + line.quantity());
            medicineRepository.save(medicine);
        }

        savedOrder.setTotalAmount(totalAmount);
        return ResponseEntity.ok(purchaseOrderRepository.save(savedOrder));
    }

    @GetMapping("/purchases/{id}/items")
    public List<PurchaseOrderItem> getOrderItems(@PathVariable Long id) {
        return purchaseOrderItemRepository.findByPurchaseOrderId(id);
    }

    public record PurchaseRequest(Long supplierId, List<PurchaseLine> items) {
    }

    public record PurchaseLine(Long medicineId, Integer quantity, BigDecimal unitPrice) {
    }
}
