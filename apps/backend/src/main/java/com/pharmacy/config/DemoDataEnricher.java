package com.pharmacy.config;

import com.pharmacy.entity.*;
import com.pharmacy.repository.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Adds a realistic demo catalogue and ~30 days of sales history so the dashboard,
 * charts and alerts look alive. It only ADDS missing data (matched by SKU / email / name)
 * and never changes or removes what you already have.
 * Turn it off with APP_DEMO_DATA=false.
 */
@Component
@Order(2)
public class DemoDataEnricher implements CommandLineRunner {

    private final MedicineRepository medicineRepository;
    private final CustomerRepository customerRepository;
    private final SupplierRepository supplierRepository;
    private final SalesInvoiceRepository salesInvoiceRepository;
    private final SalesItemRepository salesItemRepository;
    private final PurchaseOrderRepository purchaseOrderRepository;
    private final PurchaseOrderItemRepository purchaseOrderItemRepository;
    private final boolean enabled;

    public DemoDataEnricher(MedicineRepository medicineRepository,
                            CustomerRepository customerRepository,
                            SupplierRepository supplierRepository,
                            SalesInvoiceRepository salesInvoiceRepository,
                            SalesItemRepository salesItemRepository,
                            PurchaseOrderRepository purchaseOrderRepository,
                            PurchaseOrderItemRepository purchaseOrderItemRepository,
                            @Value("${app.demo-data:true}") boolean enabled) {
        this.medicineRepository = medicineRepository;
        this.customerRepository = customerRepository;
        this.supplierRepository = supplierRepository;
        this.salesInvoiceRepository = salesInvoiceRepository;
        this.salesItemRepository = salesItemRepository;
        this.purchaseOrderRepository = purchaseOrderRepository;
        this.purchaseOrderItemRepository = purchaseOrderItemRepository;
        this.enabled = enabled;
    }

    @Override
    @Transactional
    public void run(String... args) {
        if (!enabled) {
            return;
        }
        addMedicines();
        addCustomers();
        addSuppliers();
        addSalesHistory();
        addPurchaseOrders();
    }

    private void addMedicines() {
        Set<String> existing = medicineRepository.findAll().stream()
                .map(Medicine::getSku).filter(Objects::nonNull).collect(Collectors.toSet());
        List<Medicine> toAdd = new ArrayList<>();
        //                  name,              generic,           brand,        category,          sku,      qty, reorder, cost,   price,  expiry in days
        add(toAdd, existing, "Aspirin 75mg", "Acetylsalicylic acid", "Disprin", "Cardiac", "ASP-007", 210, 50, "0.20", "0.55", 700);
        add(toAdd, existing, "Atorvastatin 20mg", "Atorvastatin", "Lipitor", "Cardiac", "ATV-008", 140, 40, "1.10", "2.40", 540);
        add(toAdd, existing, "Amlodipine 5mg", "Amlodipine", "Norvasc", "Cardiac", "AML-009", 16, 40, "0.60", "1.35", 480);
        add(toAdd, existing, "Losartan 50mg", "Losartan", "Cozaar", "Cardiac", "LOS-010", 95, 30, "0.85", "1.90", 620);
        add(toAdd, existing, "Metformin 500mg", "Metformin", "Glucophage", "Diabetes", "MET-011", 260, 60, "0.30", "0.85", 800);
        add(toAdd, existing, "Gliclazide 80mg", "Gliclazide", "Diamicron", "Diabetes", "GLI-012", 72, 25, "0.70", "1.55", 410);
        add(toAdd, existing, "Insulin Glargine Pen", "Insulin glargine", "Lantus", "Diabetes", "INS-013", 12, 15, "14.00", "22.50", 120);
        add(toAdd, existing, "Salbutamol Inhaler", "Salbutamol", "Ventolin", "Respiratory", "SAL-014", 58, 20, "2.40", "4.80", 365);
        add(toAdd, existing, "Montelukast 10mg", "Montelukast", "Singulair", "Respiratory", "MON-015", 64, 20, "1.20", "2.60", 500);
        add(toAdd, existing, "Cough Syrup 100ml", "Dextromethorphan", "Benylin", "Respiratory", "COU-016", 44, 15, "1.60", "3.20", 55);
        add(toAdd, existing, "Azithromycin 500mg", "Azithromycin", "Zithromax", "Antibiotic", "AZI-017", 46, 20, "2.10", "4.40", 430);
        add(toAdd, existing, "Ciprofloxacin 500mg", "Ciprofloxacin", "Ciproxin", "Antibiotic", "CIP-018", 0, 20, "1.30", "2.90", 380);
        add(toAdd, existing, "Doxycycline 100mg", "Doxycycline", "Vibramycin", "Antibiotic", "DOX-019", 38, 15, "0.95", "2.10", 28);
        add(toAdd, existing, "Lansoprazole 30mg", "Lansoprazole", "Zoton", "Gastrointestinal", "LAN-020", 88, 25, "0.75", "1.70", 590);
        add(toAdd, existing, "ORS Sachets", "Oral rehydration salts", "Dioralyte", "Gastrointestinal", "ORS-021", 150, 40, "0.35", "0.95", 700);
        add(toAdd, existing, "Loperamide 2mg", "Loperamide", "Imodium", "Gastrointestinal", "LOP-022", 9, 20, "0.55", "1.30", 300);
        add(toAdd, existing, "Loratadine 10mg", "Loratadine", "Clarityn", "Allergy", "LOR-023", 82, 25, "0.50", "1.20", 650);
        add(toAdd, existing, "Hydrocortisone Cream 1%", "Hydrocortisone", "Dermacort", "Dermatology", "HYD-024", 54, 15, "1.40", "3.10", 450);
        add(toAdd, existing, "Clotrimazole Cream", "Clotrimazole", "Canesten", "Dermatology", "CLO-025", 41, 15, "1.80", "3.90", 40);
        add(toAdd, existing, "Diclofenac Gel 50g", "Diclofenac", "Voltarol", "Pain Relief", "DIC-026", 67, 20, "2.20", "4.60", 520);
        add(toAdd, existing, "Naproxen 250mg", "Naproxen", "Naprosyn", "Pain Relief", "NAP-027", 73, 25, "0.65", "1.45", 610);
        add(toAdd, existing, "Vitamin C 1000mg", "Ascorbic acid", "Redoxon", "Supplements", "VTC-028", 190, 50, "0.40", "1.10", 760);
        add(toAdd, existing, "Omega-3 Fish Oil", "Omega-3", "Seven Seas", "Supplements", "OMG-029", 84, 25, "1.90", "4.20", 650);
        add(toAdd, existing, "Iron + Folic Acid", "Ferrous fumarate", "Fersamal", "Supplements", "IRN-030", 120, 35, "0.50", "1.25", 720);
        add(toAdd, existing, "Multivitamin Daily", "Multivitamin", "Centrum", "Supplements", "MUL-031", 96, 30, "2.60", "5.40", 680);
        add(toAdd, existing, "Antiseptic Solution 200ml", "Povidone iodine", "Betadine", "First Aid", "ANT-032", 62, 20, "1.30", "2.80", 900);
        add(toAdd, existing, "Adhesive Plasters (40)", "Plasters", "Elastoplast", "First Aid", "PLA-033", 110, 30, "0.90", "2.20", 1200);
        add(toAdd, existing, "Digital Thermometer", "Thermometer", "Omron", "First Aid", "THM-034", 6, 8, "3.50", "7.90", 1500);
        add(toAdd, existing, "Levothyroxine 50mcg", "Levothyroxine", "Eltroxin", "Endocrine", "LEV-035", 100, 30, "0.80", "1.80", 20);
        if (!toAdd.isEmpty()) {
            medicineRepository.saveAll(toAdd);
        }
    }

    private void add(List<Medicine> list, Set<String> existing, String name, String generic, String brand, String category,
                     String sku, int qty, int reorder, String cost, String price, int expiryDays) {
        if (existing.contains(sku)) {
            return;
        }
        Medicine m = new Medicine();
        m.setName(name);
        m.setGenericName(generic);
        m.setBrand(brand);
        m.setCategory(category);
        m.setSku(sku);
        m.setQuantityInStock(qty);
        m.setReorderLevel(reorder);
        m.setUnitCost(new BigDecimal(cost));
        m.setUnitPrice(new BigDecimal(price));
        m.setExpiryDate(LocalDate.now().plusDays(expiryDays));
        list.add(m);
    }

    private void addCustomers() {
        Set<String> emails = customerRepository.findAll().stream()
                .map(Customer::getEmail).filter(Objects::nonNull).collect(Collectors.toSet());
        String[][] people = {
                {"Olivia Brown", "+44 7700 900201", "olivia.brown@demo.com", "Bristol", "600"},
                {"Liam Taylor", "+44 7700 900202", "liam.taylor@demo.com", "Sheffield", "450"},
                {"Sophia Patel", "+44 7700 900203", "sophia.patel@demo.com", "Leicester", "750"},
                {"Noah Evans", "+44 7700 900204", "noah.evans@demo.com", "Cardiff", "300"},
                {"Isla Clarke", "+44 7700 900205", "isla.clarke@demo.com", "Glasgow", "500"},
                {"Arjun Mehta", "+44 7700 900206", "arjun.mehta@demo.com", "London", "1000"},
                {"Grace Hall", "+44 7700 900207", "grace.hall@demo.com", "Nottingham", "400"},
                {"Walk-in Customer", "0000000000", "walkin@pharmacy.local", "Counter sale", "0"},
        };
        List<Customer> toAdd = new ArrayList<>();
        for (String[] p : people) {
            if (emails.contains(p[2])) {
                continue;
            }
            Customer c = new Customer();
            c.setFullName(p[0]);
            c.setPhone(p[1]);
            c.setEmail(p[2]);
            c.setAddress(p[3]);
            c.setCreditLimit(Double.parseDouble(p[4]));
            toAdd.add(c);
        }
        if (!toAdd.isEmpty()) {
            customerRepository.saveAll(toAdd);
        }
    }

    private void addSuppliers() {
        Set<String> names = supplierRepository.findAll().stream()
                .map(Supplier::getName).collect(Collectors.toSet());
        String[][] data = {
                {"MediCore Wholesale", "Hannah Doyle", "+44 113 555 7788", "trade@medicore.co.uk", "Manchester, UK"},
                {"Apex Generics", "Sanjay Rao", "+44 20 5550 3321", "orders@apexgenerics.co.uk", "London, UK"},
        };
        List<Supplier> toAdd = new ArrayList<>();
        for (String[] d : data) {
            if (names.contains(d[0])) {
                continue;
            }
            Supplier s = new Supplier();
            s.setName(d[0]);
            s.setContactPerson(d[1]);
            s.setPhone(d[2]);
            s.setEmail(d[3]);
            s.setAddress(d[4]);
            toAdd.add(s);
        }
        if (!toAdd.isEmpty()) {
            supplierRepository.saveAll(toAdd);
        }
    }

    /** ~30 days of invoices. Stock is not touched: this is history, the stock levels above are "today". */
    private void addSalesHistory() {
        if (salesInvoiceRepository.count() >= 20) {
            return;
        }
        List<Medicine> medicines = medicineRepository.findAll().stream()
                .filter(Medicine::isActive).collect(Collectors.toList());
        List<Customer> customers = customerRepository.findAll();
        if (medicines.isEmpty() || customers.isEmpty()) {
            return;
        }
        Random random = new Random(42);
        String[] methods = {"CARD", "CASH", "UPI", "CARD", "CASH"};
        LocalDate today = LocalDate.now();

        for (int daysAgo = 30; daysAgo >= 0; daysAgo--) {
            LocalDate date = today.minusDays(daysAgo);
            int dayOfWeek = date.getDayOfWeek().getValue();
            int count = (dayOfWeek >= 6 ? 2 : 3) + random.nextInt(4);
            if (daysAgo == 0) {
                count = 4;
            }
            for (int n = 0; n < count; n++) {
                SalesInvoice invoice = new SalesInvoice();
                invoice.setCustomerId(customers.get(random.nextInt(customers.size())).getId());
                invoice.setInvoiceDate(date);
                LocalDateTime createdAt = daysAgo == 0
                        ? LocalDateTime.now().minusMinutes(20L + random.nextInt(400))
                        : date.atTime(8 + random.nextInt(10), random.nextInt(60));
                invoice.setCreatedAt(createdAt);
                invoice.setPaymentMethod(methods[random.nextInt(methods.length)]);
                int roll = random.nextInt(100);
                String status = "PAID";
                if (daysAgo >= 10 && roll < 5) {
                    status = "OVERDUE";
                } else if (daysAgo >= 1 && roll < 14) {
                    status = "PENDING";
                }
                invoice.setStatus(status);
                SalesInvoice saved = salesInvoiceRepository.save(invoice);

                BigDecimal total = BigDecimal.ZERO;
                int lines = 1 + random.nextInt(3);
                Set<Long> used = new HashSet<>();
                for (int l = 0; l < lines; l++) {
                    Medicine medicine = medicines.get(random.nextInt(medicines.size()));
                    if (!used.add(medicine.getId())) {
                        continue;
                    }
                    int quantity = 1 + random.nextInt(4);
                    BigDecimal lineTotal = medicine.getUnitPrice().multiply(BigDecimal.valueOf(quantity))
                            .setScale(2, RoundingMode.HALF_UP);
                    SalesItem item = new SalesItem();
                    item.setSalesInvoiceId(saved.getId());
                    item.setMedicineId(medicine.getId());
                    item.setQuantity(quantity);
                    item.setUnitPrice(medicine.getUnitPrice());
                    item.setTotalAmount(lineTotal);
                    salesItemRepository.save(item);
                    total = total.add(lineTotal);
                }
                saved.setTotalAmount(total);
                salesInvoiceRepository.save(saved);
            }
        }
    }

    private void addPurchaseOrders() {
        if (purchaseOrderRepository.count() >= 5) {
            return;
        }
        List<Medicine> medicines = medicineRepository.findAll().stream()
                .filter(Medicine::isActive).collect(Collectors.toList());
        List<Supplier> suppliers = supplierRepository.findAll();
        if (medicines.size() < 6 || suppliers.isEmpty()) {
            return;
        }
        Random random = new Random(7);
        String[] statuses = {"ORDERED", "ORDERED", "RECEIVED", "RECEIVED"};
        int[] daysAgo = {1, 3, 9, 16};
        for (int i = 0; i < statuses.length; i++) {
            PurchaseOrder order = new PurchaseOrder();
            order.setSupplierId(suppliers.get(i % suppliers.size()).getId());
            order.setOrderDate(LocalDate.now().minusDays(daysAgo[i]));
            order.setCreatedAt(order.getOrderDate().atTime(10, 15));
            order.setStatus(statuses[i]);
            if (statuses[i].equals("RECEIVED")) {
                order.setReceivedDate(order.getOrderDate().plusDays(2));
            }
            PurchaseOrder saved = purchaseOrderRepository.save(order);

            BigDecimal total = BigDecimal.ZERO;
            Set<Long> used = new HashSet<>();
            for (int l = 0; l < 3; l++) {
                Medicine medicine = medicines.get(random.nextInt(medicines.size()));
                if (!used.add(medicine.getId())) {
                    continue;
                }
                int quantity = 20 + random.nextInt(8) * 10;
                BigDecimal lineTotal = medicine.getUnitCost().multiply(BigDecimal.valueOf(quantity))
                        .setScale(2, RoundingMode.HALF_UP);
                PurchaseOrderItem item = new PurchaseOrderItem();
                item.setPurchaseOrderId(saved.getId());
                item.setMedicineId(medicine.getId());
                item.setQuantity(quantity);
                item.setUnitPrice(medicine.getUnitCost());
                item.setTotalAmount(lineTotal);
                purchaseOrderItemRepository.save(item);
                total = total.add(lineTotal);
            }
            saved.setTotalAmount(total);
            purchaseOrderRepository.save(saved);
        }
    }
}
