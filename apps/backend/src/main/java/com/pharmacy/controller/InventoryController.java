package com.pharmacy.controller;

import com.pharmacy.entity.Medicine;
import com.pharmacy.repository.MedicineRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

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
        return ResponseEntity.ok(medicineRepository.save(medicine));
    }

    @PutMapping("/inventory/{id}")
    public ResponseEntity<Medicine> updateMedicine(@PathVariable Long id, @RequestBody Medicine updatedMedicine) {
        return medicineRepository.findById(id)
                .map(existing -> {
                    existing.setName(updatedMedicine.getName());
                    existing.setGenericName(updatedMedicine.getGenericName());
                    existing.setBrand(updatedMedicine.getBrand());
                    existing.setCategory(updatedMedicine.getCategory());
                    existing.setSku(updatedMedicine.getSku());
                    existing.setQuantityInStock(updatedMedicine.getQuantityInStock());
                    existing.setReorderLevel(updatedMedicine.getReorderLevel());
                    existing.setUnitCost(updatedMedicine.getUnitCost());
                    existing.setUnitPrice(updatedMedicine.getUnitPrice());
                    existing.setExpiryDate(updatedMedicine.getExpiryDate());
                    existing.setActive(updatedMedicine.isActive());
                    return ResponseEntity.ok(medicineRepository.save(existing));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/inventory/{id}")
    public ResponseEntity<Void> deleteMedicine(@PathVariable Long id) {
        if (medicineRepository.existsById(id)) {
            medicineRepository.deleteById(id);
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.notFound().build();
    }
}
