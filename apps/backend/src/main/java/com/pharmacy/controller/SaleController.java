package com.pharmacy.controller;

import com.pharmacy.entity.*;
import com.pharmacy.repository.*;
import org.springframework.data.domain.Sort;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;

@RestController
@RequestMapping("/api")
public class SaleController {

    private static final Set<String> STATUSES = Set.of("PAID", "PENDING", "OVERDUE", "CANCELLED");

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
        return salesInvoiceRepository.findAll(Sort.by(Sort.Direction.DESC, "id"));
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

    /** Invoice with customer and line items (medicine names resolved) for the invoice view and PDF. */
    @GetMapping("/sales/{id}/detail")
    public ResponseEntity<Map<String, Object>> getSaleDetail(@PathVariable Long id) {
        return salesInvoiceRepository.findById(id).map(invoice -> {
            Customer customer = customerRepository.findById(invoice.getCustomerId()).orElse(null);
            List<Map<String, Object>> lines = new ArrayList<>();
            for (SalesItem item : salesItemRepository.findBySalesInvoiceId(id)) {
                Medicine medicine = medicineRepository.findById(item.getMedicineId()).orElse(null);
                Map<String, Object> line = new LinkedHashMap<>();
                line.put("medicineId", item.getMedicineId());
                line.put("name", medicine != null ? medicine.getName() : "Medicine #" + item.getMedicineId());
                line.put("sku", medicine != null ? medicine.getSku() : "");
                line.put("quantity", item.getQuantity());
                line.put("unitPrice", item.getUnitPrice());
                line.put("totalAmount", item.getTotalAmount());
                lines.add(line);
            }
            Map<String, Object> body = new LinkedHashMap<>();
            body.put("invoice", invoice);
            body.put("customer", customer);
            body.put("lines", lines);
            return ResponseEntity.ok(body);
        }).orElse(ResponseEntity.notFound().build());
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
    @Transactional
    public ResponseEntity<SalesInvoice> createSale(@RequestBody SaleRequest request) {
        if (request.customerId() == null) {
            throw new IllegalArgumentException("Select a customer");
        }
        if (request.items() == null || request.items().isEmpty()) {
            throw new IllegalArgumentException("Add at least one medicine to the invoice");
        }
        Customer customer = customerRepository.findById(request.customerId())
                .orElseThrow(() -> new IllegalArgumentException("Customer not found"));

        String status = request.status() == null ? "PAID" : request.status().toUpperCase();
        if (!status.equals("PAID") && !status.equals("PENDING")) {
            throw new IllegalArgumentException("New invoices can only be PAID or PENDING");
        }

        // Merge repeated medicines so the stock check sees the combined quantity.
        Map<Long, Integer> quantities = new LinkedHashMap<>();
        for (SaleLine line : request.items()) {
            if (line.medicineId() == null || line.quantity() == null || line.quantity() <= 0) {
                throw new IllegalArgumentException("Each line needs a medicine and a quantity above zero");
            }
            quantities.merge(line.medicineId(), line.quantity(), Integer::sum);
        }

        SalesInvoice invoice = new SalesInvoice();
        invoice.setCustomerId(customer.getId());
        invoice.setStatus(status);
        invoice.setPaymentMethod(request.paymentMethod());
        SalesInvoice savedInvoice = salesInvoiceRepository.save(invoice);
        BigDecimal totalAmount = BigDecimal.ZERO;

        for (Map.Entry<Long, Integer> entry : quantities.entrySet()) {
            Medicine medicine = medicineRepository.findById(entry.getKey())
                    .orElseThrow(() -> new IllegalArgumentException("Medicine not found: " + entry.getKey()));
            int quantity = entry.getValue();

            if (!medicine.isActive()) {
                throw new IllegalArgumentException(medicine.getName() + " is no longer sold");
            }
            if (medicine.getExpiryDate() != null && medicine.getExpiryDate().isBefore(LocalDate.now())) {
                throw new IllegalArgumentException(medicine.getName() + " has expired and cannot be sold");
            }
            if (medicine.getQuantityInStock() < quantity) {
                throw new IllegalArgumentException("Insufficient stock for " + medicine.getName()
                        + " (only " + medicine.getQuantityInStock() + " left)");
            }

            BigDecimal lineTotal = medicine.getUnitPrice().multiply(BigDecimal.valueOf(quantity));
            totalAmount = totalAmount.add(lineTotal);

            SalesItem item = new SalesItem();
            item.setSalesInvoiceId(savedInvoice.getId());
            item.setMedicineId(medicine.getId());
            item.setQuantity(quantity);
            item.setUnitPrice(medicine.getUnitPrice());
            item.setTotalAmount(lineTotal);
            salesItemRepository.save(item);

            medicine.setQuantityInStock(medicine.getQuantityInStock() - quantity);
            medicineRepository.save(medicine);
        }

        savedInvoice.setTotalAmount(totalAmount);
        return ResponseEntity.ok(salesInvoiceRepository.save(savedInvoice));
    }

    /** Mark an invoice paid / overdue, or cancel it (cancelling puts the stock back). */
    @PutMapping("/sales/{id}/status")
    @Transactional
    public ResponseEntity<SalesInvoice> updateStatus(@PathVariable Long id, @RequestBody StatusRequest request) {
        String next = request.status() == null ? "" : request.status().toUpperCase();
        if (!STATUSES.contains(next)) {
            throw new IllegalArgumentException("Status must be one of " + STATUSES);
        }
        SalesInvoice invoice = salesInvoiceRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Invoice not found"));
        String current = invoice.getStatus().toUpperCase();
        if (current.equals("CANCELLED")) {
            throw new IllegalArgumentException("Cancelled invoices cannot be changed");
        }
        if (next.equals("CANCELLED")) {
            for (SalesItem item : salesItemRepository.findBySalesInvoiceId(id)) {
                medicineRepository.findById(item.getMedicineId()).ifPresent(medicine -> {
                    medicine.setQuantityInStock(medicine.getQuantityInStock() + item.getQuantity());
                    medicineRepository.save(medicine);
                });
            }
        }
        invoice.setStatus(next);
        return ResponseEntity.ok(salesInvoiceRepository.save(invoice));
    }

    public record SaleRequest(Long customerId, List<SaleLine> items, String status, String paymentMethod) {
    }

    public record SaleLine(Long medicineId, Integer quantity) {
    }

    public record StatusRequest(String status) {
    }
}
