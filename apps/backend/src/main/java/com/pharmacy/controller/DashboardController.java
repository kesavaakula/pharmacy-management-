package com.pharmacy.controller;

import com.pharmacy.entity.Medicine;
import com.pharmacy.entity.PurchaseOrder;
import com.pharmacy.entity.SalesInvoice;
import com.pharmacy.entity.SalesItem;
import com.pharmacy.repository.*;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api")
public class DashboardController {

    private final MedicineRepository medicineRepository;
    private final SalesInvoiceRepository salesInvoiceRepository;
    private final SalesItemRepository salesItemRepository;
    private final PurchaseOrderRepository purchaseOrderRepository;
    private final CustomerRepository customerRepository;
    private final SupplierRepository supplierRepository;

    public DashboardController(MedicineRepository medicineRepository,
                              SalesInvoiceRepository salesInvoiceRepository,
                              SalesItemRepository salesItemRepository,
                              PurchaseOrderRepository purchaseOrderRepository,
                              CustomerRepository customerRepository,
                              SupplierRepository supplierRepository) {
        this.medicineRepository = medicineRepository;
        this.salesInvoiceRepository = salesInvoiceRepository;
        this.salesItemRepository = salesItemRepository;
        this.purchaseOrderRepository = purchaseOrderRepository;
        this.customerRepository = customerRepository;
        this.supplierRepository = supplierRepository;
    }

    @GetMapping("/dashboard/summary")
    public Map<String, Object> summary() {
        LocalDate today = LocalDate.now();
        LocalDate monthStart = today.withDayOfMonth(1);

        List<Medicine> medicines = medicineRepository.findByActiveTrue();
        Map<Long, Medicine> medicineById = medicines.stream().collect(Collectors.toMap(Medicine::getId, m -> m));

        List<SalesInvoice> invoices = salesInvoiceRepository.findAll().stream()
                .filter(i -> !"CANCELLED".equalsIgnoreCase(i.getStatus()))
                .toList();
        List<PurchaseOrder> orders = purchaseOrderRepository.findAll();

        BigDecimal stockValue = medicines.stream()
                .map(m -> m.getUnitPrice().multiply(BigDecimal.valueOf(m.getQuantityInStock())))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        List<Medicine> lowStock = medicines.stream()
                .filter(m -> m.getQuantityInStock() <= m.getReorderLevel())
                .sorted(Comparator.comparingInt(Medicine::getQuantityInStock))
                .toList();

        long outOfStock = medicines.stream().filter(m -> m.getQuantityInStock() == 0).count();

        BigDecimal monthlyRevenue = sum(invoices.stream()
                .filter(i -> !i.getInvoiceDate().isBefore(monthStart))
                .map(SalesInvoice::getTotalAmount));
        BigDecimal todayRevenue = sum(invoices.stream()
                .filter(i -> i.getInvoiceDate().isEqual(today))
                .map(SalesInvoice::getTotalAmount));
        long todaySales = invoices.stream().filter(i -> i.getInvoiceDate().isEqual(today)).count();
        BigDecimal pendingPayments = sum(invoices.stream()
                .filter(i -> !"PAID".equalsIgnoreCase(i.getStatus()))
                .map(SalesInvoice::getTotalAmount));
        BigDecimal monthlyPurchases = sum(orders.stream()
                .filter(o -> !"CANCELLED".equalsIgnoreCase(o.getStatus()))
                .filter(o -> !o.getOrderDate().isBefore(monthStart))
                .map(PurchaseOrder::getTotalAmount));
        long openOrders = orders.stream().filter(o -> "ORDERED".equalsIgnoreCase(o.getStatus())).count();

        // Sales for the last 14 days (zero-filled so the chart has no gaps).
        List<Map<String, Object>> trend = new ArrayList<>();
        for (int i = 13; i >= 0; i--) {
            LocalDate day = today.minusDays(i);
            List<SalesInvoice> dayInvoices = invoices.stream().filter(inv -> inv.getInvoiceDate().isEqual(day)).toList();
            trend.add(row("date", day.toString(),
                    "revenue", sum(dayInvoices.stream().map(SalesInvoice::getTotalAmount)),
                    "orders", dayInvoices.size()));
        }

        // Best sellers over the last 30 days.
        Set<Long> recentInvoiceIds = invoices.stream()
                .filter(i -> !i.getInvoiceDate().isBefore(today.minusDays(30)))
                .map(SalesInvoice::getId)
                .collect(Collectors.toSet());
        Map<Long, int[]> qtyByMedicine = new HashMap<>();
        Map<Long, BigDecimal> revenueByMedicine = new HashMap<>();
        for (SalesItem item : salesItemRepository.findAll()) {
            if (!recentInvoiceIds.contains(item.getSalesInvoiceId())) {
                continue;
            }
            qtyByMedicine.computeIfAbsent(item.getMedicineId(), k -> new int[1])[0] += item.getQuantity();
            revenueByMedicine.merge(item.getMedicineId(), item.getTotalAmount(), BigDecimal::add);
        }
        List<Map<String, Object>> topSelling = qtyByMedicine.entrySet().stream()
                .sorted((a, b) -> Integer.compare(b.getValue()[0], a.getValue()[0]))
                .limit(5)
                .map(e -> {
                    Medicine m = medicineById.get(e.getKey());
                    return row("name", m != null ? m.getName() : "Medicine #" + e.getKey(),
                            "quantity", e.getValue()[0],
                            "revenue", revenueByMedicine.getOrDefault(e.getKey(), BigDecimal.ZERO));
                })
                .toList();

        // Stock value by category.
        Map<String, BigDecimal> byCategory = new HashMap<>();
        for (Medicine m : medicines) {
            byCategory.merge(m.getCategory(), m.getUnitPrice().multiply(BigDecimal.valueOf(m.getQuantityInStock())), BigDecimal::add);
        }
        List<Map<String, Object>> categories = byCategory.entrySet().stream()
                .sorted((a, b) -> b.getValue().compareTo(a.getValue()))
                .map(e -> row("category", e.getKey(), "value", e.getValue()))
                .toList();

        // Expiry watch: already expired or expiring within 90 days.
        List<Map<String, Object>> expiring = medicines.stream()
                .filter(m -> m.getExpiryDate() != null && !m.getExpiryDate().isAfter(today.plusDays(90)))
                .sorted(Comparator.comparing(Medicine::getExpiryDate))
                .limit(8)
                .map(m -> row("id", m.getId(), "name", m.getName(),
                        "expiryDate", m.getExpiryDate().toString(),
                        "daysLeft", ChronoUnit.DAYS.between(today, m.getExpiryDate()),
                        "quantityInStock", m.getQuantityInStock()))
                .toList();
        long expiredCount = medicines.stream().filter(m -> m.getExpiryDate() != null && m.getExpiryDate().isBefore(today)).count();

        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("serverTime", Instant.now().toString());
        summary.put("totalMedicines", medicines.size());
        summary.put("customers", customerRepository.count());
        summary.put("suppliers", supplierRepository.count());
        summary.put("lowStockAlerts", lowStock.size());
        summary.put("outOfStock", outOfStock);
        summary.put("expiredCount", expiredCount);
        summary.put("inventoryValue", stockValue);
        summary.put("monthlyRevenue", monthlyRevenue);
        summary.put("monthlyPurchases", monthlyPurchases);
        summary.put("todayRevenue", todayRevenue);
        summary.put("todaySales", todaySales);
        summary.put("pendingPayments", pendingPayments);
        summary.put("openPurchaseOrders", openOrders);
        summary.put("lowStockItems", lowStock);
        summary.put("expiringSoon", expiring);
        summary.put("salesTrend", trend);
        summary.put("topSelling", topSelling);
        summary.put("categoryBreakdown", categories);
        summary.put("recentActivity", recentActivity());
        return summary;
    }

    private List<Map<String, Object>> recentActivity() {
        record Event(LocalDateTime at, Map<String, Object> data) {
        }
        List<Event> events = new ArrayList<>();
        Map<Long, String> customerNames = customerRepository.findAll().stream()
                .collect(Collectors.toMap(c -> c.getId(), c -> c.getFullName()));
        Map<Long, String> supplierNames = supplierRepository.findAll().stream()
                .collect(Collectors.toMap(s -> s.getId(), s -> s.getName()));

        for (SalesInvoice invoice : salesInvoiceRepository.findAll()) {
            LocalDateTime at = invoice.getCreatedAt() != null ? invoice.getCreatedAt() : invoice.getInvoiceDate().atStartOfDay();
            events.add(new Event(at, row("type", "SALE", "id", invoice.getId(),
                    "title", "Invoice INV-" + invoice.getId() + " · " + customerNames.getOrDefault(invoice.getCustomerId(), "Walk-in"),
                    "status", invoice.getStatus(), "amount", invoice.getTotalAmount(),
                    "at", at.atZone(ZoneId.systemDefault()).toInstant().toString())));
        }
        for (PurchaseOrder order : purchaseOrderRepository.findAll()) {
            LocalDateTime at = order.getCreatedAt() != null ? order.getCreatedAt() : order.getOrderDate().atStartOfDay();
            events.add(new Event(at, row("type", "PURCHASE", "id", order.getId(),
                    "title", "PO-" + order.getId() + " · " + supplierNames.getOrDefault(order.getSupplierId(), "Supplier"),
                    "status", order.getStatus(), "amount", order.getTotalAmount(),
                    "at", at.atZone(ZoneId.systemDefault()).toInstant().toString())));
        }
        return events.stream()
                .sorted((a, b) -> b.at().compareTo(a.at()))
                .limit(10)
                .map(Event::data)
                .toList();
    }

    private static BigDecimal sum(java.util.stream.Stream<BigDecimal> values) {
        return values.reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private static Map<String, Object> row(Object... keyValues) {
        Map<String, Object> map = new LinkedHashMap<>();
        for (int i = 0; i < keyValues.length; i += 2) {
            map.put((String) keyValues[i], keyValues[i + 1]);
        }
        return map;
    }
}
