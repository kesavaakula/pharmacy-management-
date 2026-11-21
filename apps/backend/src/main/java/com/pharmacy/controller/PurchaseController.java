package com.pharmacy.controller;

import com.pharmacy.entity.*;
import com.pharmacy.repository.*;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;

/**
 * Purchase workflow: ORDERED (stock unchanged) -> RECEIVED (stock added) or CANCELLED.
 */
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
        return purchaseOrderRepository.findAll(Sort.by(Sort.Direction.DESC, "id"));
    }

    @PostMapping("/purchases")
    @Transactional
    public ResponseEntity<PurchaseOrder> createPurchase(@RequestBody PurchaseRequest request) {
        if (request.supplierId() == null) {
            throw new IllegalArgumentException("Select a supplier");
        }
        if (request.items() == null || request.items().isEmpty()) {
            throw new IllegalArgumentException("Add at least one medicine to the order");
        }
        Supplier supplier = supplierRepository.findById(request.supplierId())
                .orElseThrow(() -> new IllegalArgumentException("Supplier not found"));

        PurchaseOrder order = new PurchaseOrder();
        order.setSupplierId(supplier.getId());
        order.setStatus("ORDERED");

        PurchaseOrder savedOrder = purchaseOrderRepository.save(order);
        BigDecimal totalAmount = BigDecimal.ZERO;

        for (PurchaseLine line : request.items()) {
            if (line.medicineId() == null || line.quantity() == null || line.quantity() <= 0) {
                throw new IllegalArgumentException("Each line needs a medicine and a quantity above zero");
            }
            Medicine medicine = medicineRepository.findById(line.medicineId())
                    .orElseThrow(() -> new IllegalArgumentException("Medicine not found: " + line.medicineId()));

            BigDecimal unitPrice = line.unitPrice() != null ? line.unitPrice() : medicine.getUnitCost();
            if (unitPrice.signum() < 0) {
                throw new IllegalArgumentException("Prices cannot be negative");
            }
            BigDecimal lineTotal = unitPrice.multiply(BigDecimal.valueOf(line.quantity()));
            totalAmount = totalAmount.add(lineTotal);

            PurchaseOrderItem item = new PurchaseOrderItem();
            item.setPurchaseOrderId(savedOrder.getId());
            item.setMedicineId(medicine.getId());
            item.setQuantity(line.quantity());
            item.setUnitPrice(unitPrice);
            item.setTotalAmount(lineTotal);
            purchaseOrderItemRepository.save(item);
        }

        savedOrder.setTotalAmount(totalAmount);
        return ResponseEntity.ok(purchaseOrderRepository.save(savedOrder));
    }

    /** Goods arrived: add the quantities to stock and record the new cost price. */
    @PutMapping("/purchases/{id}/receive")
    @Transactional
    public ResponseEntity<PurchaseOrder> receive(@PathVariable Long id) {
        PurchaseOrder order = purchaseOrderRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Purchase order not found"));
        if (!"ORDERED".equalsIgnoreCase(order.getStatus())) {
            throw new IllegalArgumentException("Only orders in ORDERED status can be received");
        }
        for (PurchaseOrderItem item : purchaseOrderItemRepository.findByPurchaseOrderId(id)) {
            medicineRepository.findById(item.getMedicineId()).ifPresent(medicine -> {
                medicine.setQuantityInStock(medicine.getQuantityInStock() + item.getQuantity());
                medicine.setUnitCost(item.getUnitPrice());
                medicineRepository.save(medicine);
            });
        }
        order.setStatus("RECEIVED");
        order.setReceivedDate(LocalDate.now());
        return ResponseEntity.ok(purchaseOrderRepository.save(order));
    }

    @PutMapping("/purchases/{id}/cancel")
    @Transactional
    public ResponseEntity<PurchaseOrder> cancel(@PathVariable Long id) {
        PurchaseOrder order = purchaseOrderRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Purchase order not found"));
        if (!"ORDERED".equalsIgnoreCase(order.getStatus())) {
            throw new IllegalArgumentException("Only orders in ORDERED status can be cancelled");
        }
        order.setStatus("CANCELLED");
        return ResponseEntity.ok(purchaseOrderRepository.save(order));
    }

    @GetMapping("/purchases/{id}/items")
    public List<PurchaseOrderItem> getOrderItems(@PathVariable Long id) {
        return purchaseOrderItemRepository.findByPurchaseOrderId(id);
    }

    @GetMapping("/purchases/{id}/detail")
    public ResponseEntity<Map<String, Object>> getOrderDetail(@PathVariable Long id) {
        return purchaseOrderRepository.findById(id).map(order -> {
            Supplier supplier = supplierRepository.findById(order.getSupplierId()).orElse(null);
            List<Map<String, Object>> lines = new ArrayList<>();
            for (PurchaseOrderItem item : purchaseOrderItemRepository.findByPurchaseOrderId(id)) {
                Medicine medicine = medicineRepository.findById(item.getMedicineId()).orElse(null);
                Map<String, Object> line = new LinkedHashMap<>();
                line.put("medicineId", item.getMedicineId());
                line.put("name", medicine != null ? medicine.getName() : "Medicine #" + item.getMedicineId());
                line.put("quantity", item.getQuantity());
                line.put("unitPrice", item.getUnitPrice());
                line.put("totalAmount", item.getTotalAmount());
                lines.add(line);
            }
            Map<String, Object> body = new LinkedHashMap<>();
            body.put("order", order);
            body.put("supplier", supplier);
            body.put("lines", lines);
            return ResponseEntity.ok(body);
        }).orElse(ResponseEntity.notFound().build());
    }

    public record PurchaseRequest(Long supplierId, List<PurchaseLine> items) {
    }

    public record PurchaseLine(Long medicineId, Integer quantity, BigDecimal unitPrice) {
    }
}
