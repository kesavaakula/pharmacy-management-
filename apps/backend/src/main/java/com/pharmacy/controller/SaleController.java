package com.pharmacy.controller;

import com.pharmacy.entity.*;
import com.pharmacy.repository.*;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/api")
public class SaleController {

    private final SalesInvoiceRepository salesInvoiceRepository;
    private final SalesItemRepository salesItemRepository;
    private final MedicineRepository medicineRepository;
    private final CustomerRepository customerRepository;

    public SaleController(SalesInvoiceRepository salesInvoiceRepository,
                         SalesItemRepository salesItemRepository,
                         MedicineRepository medicineRepository,
                         CustomerRepository customerRepository) {
        this.salesInvoiceRepository = salesInvoiceRepository;
        this.salesItemRepository = salesItemRepository;
        this.medicineRepository = medicineRepository;
        this.customerRepository = customerRepository;
    }

    @GetMapping("/sales")
    public List<SalesInvoice> listSales() {
        return salesInvoiceRepository.findAll();
    }

    @GetMapping("/sales/{id}")
    public ResponseEntity<SalesInvoice> getSale(@PathVariable Long id) {
        return salesInvoiceRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/sales/{id}/items")
    public List<SalesItem> getSaleItems(@PathVariable Long id) {
        return salesItemRepository.findBySalesInvoiceId(id);
    }

    @GetMapping("/sales/{id}/export")
    public ResponseEntity<String> exportInvoice(@PathVariable Long id) {
        SalesInvoice invoice = salesInvoiceRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Invoice not found: " + id));

        Customer customer = customerRepository.findById(invoice.getCustomerId())
                .orElse(new Customer());

        StringBuilder content = new StringBuilder();
        content.append("PharmaFlow Pharmacy Invoice\n");
        content.append("===========================\n");
        content.append("Invoice Number: INV-").append(invoice.getId()).append("\n");
        content.append("Date: ").append(invoice.getInvoiceDate()).append("\n");
        content.append("Customer: ").append(customer.getFullName() == null ? "Walk-in" : customer.getFullName()).append("\n");
        content.append("Status: ").append(invoice.getStatus()).append("\n\n");

        List<SalesItem> items = salesItemRepository.findBySalesInvoiceId(id);
        for (SalesItem item : items) {
            Medicine medicine = medicineRepository.findById(item.getMedicineId()).orElse(null);
            content.append(medicine != null ? medicine.getName() : "Medicine #" + item.getMedicineId())
                    .append(" x").append(item.getQuantity())
                    .append(" @ £").append(item.getUnitPrice())
                    .append(" = £").append(item.getTotalAmount())
                    .append("\n");
        }

        content.append("\nTotal Amount: £").append(invoice.getTotalAmount()).append("\n");

        HttpHeaders headers = new HttpHeaders();
        headers.setContentDisposition(ContentDisposition.attachment()
                .filename("invoice-INV-" + invoice.getId() + ".txt")
                .build());
        headers.set("Content-Type", "text/plain; charset=UTF-8");

        return ResponseEntity.ok().headers(headers).body(content.toString());
    }

    @PostMapping("/sales")
    public ResponseEntity<SalesInvoice> createSale(@RequestBody SaleRequest request) {
        Customer customer = customerRepository.findById(request.customerId())
                .orElseThrow(() -> new IllegalArgumentException("Customer not found"));

        SalesInvoice invoice = new SalesInvoice();
        invoice.setCustomerId(customer.getId());
        invoice.setStatus("PAID");

        SalesInvoice savedInvoice = salesInvoiceRepository.save(invoice);
        BigDecimal totalAmount = BigDecimal.ZERO;

        for (SaleLine line : request.items()) {
            Medicine medicine = medicineRepository.findById(line.medicineId())
                    .orElseThrow(() -> new IllegalArgumentException("Medicine not found: " + line.medicineId()));

            if (medicine.getQuantityInStock() < line.quantity()) {
                throw new IllegalArgumentException("Insufficient stock for medicine: " + medicine.getName());
            }

            BigDecimal lineTotal = medicine.getUnitPrice().multiply(BigDecimal.valueOf(line.quantity()));
            totalAmount = totalAmount.add(lineTotal);

            SalesItem item = new SalesItem();
            item.setSalesInvoiceId(savedInvoice.getId());
            item.setMedicineId(medicine.getId());
            item.setQuantity(line.quantity());
            item.setUnitPrice(medicine.getUnitPrice());
            item.setTotalAmount(lineTotal);
            salesItemRepository.save(item);

            medicine.setQuantityInStock(medicine.getQuantityInStock() - line.quantity());
            medicineRepository.save(medicine);
        }

        savedInvoice.setTotalAmount(totalAmount);
        return ResponseEntity.ok(salesInvoiceRepository.save(savedInvoice));
    }

    public record SaleRequest(Long customerId, List<SaleLine> items) {
    }

    public record SaleLine(Long medicineId, Integer quantity) {
    }
}
