package com.pharmacy.controller;

import com.pharmacy.entity.Medicine;
import com.pharmacy.repository.MedicineRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api")
public class InventoryController {

    private final MedicineRepository medicineRepository;

    public InventoryController(MedicineRepository medicineRepository) {
        this.medicineRepository = medicineRepository;
    }

    @GetMapping("/inventory")
    public List<Medicine> listInventory() {
        return medicineRepository.findByActiveTrue();
    }

    @PostMapping("/inventory")
    public ResponseEntity<Medicine> createMedicine(@RequestBody Medicine medicine) {
        validate(medicine);
        medicine.setId(null);
        medicine.setActive(true);
        if (medicine.getSku() == null || medicine.getSku().isBlank()) {
            medicine.setSku("MED-" + UUID.randomUUID().toString().substring(0, 6).toUpperCase());
        }
        return ResponseEntity.ok(medicineRepository.save(medicine));
    }

    @PutMapping("/inventory/{id}")
    public ResponseEntity<Medicine> updateMedicine(@PathVariable Long id, @RequestBody Medicine updatedMedicine) {
        validate(updatedMedicine);
        return medicineRepository.findById(id)
                .map(existing -> {
                    existing.setName(updatedMedicine.getName());
                    existing.setGenericName(updatedMedicine.getGenericName());
                    existing.setBrand(updatedMedicine.getBrand());
                    existing.setCategory(updatedMedicine.getCategory());
                    if (updatedMedicine.getSku() != null && !updatedMedicine.getSku().isBlank()) {
                        existing.setSku(updatedMedicine.getSku());
                    }
                    existing.setQuantityInStock(updatedMedicine.getQuantityInStock());
                    existing.setReorderLevel(updatedMedicine.getReorderLevel());
                    existing.setUnitCost(updatedMedicine.getUnitCost());
                    existing.setUnitPrice(updatedMedicine.getUnitPrice());
                    existing.setExpiryDate(updatedMedicine.getExpiryDate());
                    existing.setActive(true);
                    return ResponseEntity.ok(medicineRepository.save(existing));
                })
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    /** Quick stock correction: positive adds stock, negative removes it (never below zero). */
    @PostMapping("/inventory/{id}/adjust")
    @Transactional
    public ResponseEntity<Medicine> adjustStock(@PathVariable Long id, @RequestBody AdjustRequest request) {
        if (request.delta() == null || request.delta() == 0) {
            throw new IllegalArgumentException("Enter a non-zero adjustment");
        }
        return medicineRepository.findById(id)
                .map(medicine -> {
                    int updated = medicine.getQuantityInStock() + request.delta();
                    if (updated < 0) {
                        throw new IllegalArgumentException("Stock cannot go below zero");
                    }
                    medicine.setQuantityInStock(updated);
                    return ResponseEntity.ok(medicineRepository.save(medicine));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    /** Soft delete: invoices and purchase orders keep referring to the medicine. */
    @DeleteMapping("/inventory/{id}")
    public ResponseEntity<Void> deleteMedicine(@PathVariable Long id) {
        var medicine = medicineRepository.findById(id);
        if (medicine.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        medicine.get().setActive(false);
        medicineRepository.save(medicine.get());
        return ResponseEntity.noContent().build();
    }

    private void validate(Medicine medicine) {
        if (medicine.getName() == null || medicine.getName().isBlank()) {
            throw new IllegalArgumentException("Medicine name is required");
        }
        if (medicine.getCategory() == null || medicine.getCategory().isBlank()) {
            throw new IllegalArgumentException("Category is required");
        }
        if (medicine.getQuantityInStock() == null || medicine.getQuantityInStock() < 0) {
            throw new IllegalArgumentException("Quantity cannot be negative");
        }
        if (medicine.getUnitPrice() == null || medicine.getUnitPrice().signum() < 0
                || medicine.getUnitCost() == null || medicine.getUnitCost().signum() < 0) {
            throw new IllegalArgumentException("Prices cannot be negative");
        }
        if (medicine.getReorderLevel() == null) {
            medicine.setReorderLevel(10);
        }
    }

    public record AdjustRequest(Integer delta) {
    }
}
