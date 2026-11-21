package com.pharmacy.config;

import com.pharmacy.entity.*;
import com.pharmacy.repository.*;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Component
@Order(1)
public class DataSeeder implements CommandLineRunner {

    private final UserRepository userRepository;
    private final MedicineRepository medicineRepository;
    private final CustomerRepository customerRepository;
    private final SupplierRepository supplierRepository;
    private final SalesInvoiceRepository salesInvoiceRepository;
    private final SalesItemRepository salesItemRepository;
    private final PurchaseOrderRepository purchaseOrderRepository;
    private final PurchaseOrderItemRepository purchaseOrderItemRepository;
    private final PasswordEncoder passwordEncoder;

    public DataSeeder(UserRepository userRepository,
                      MedicineRepository medicineRepository,
                      CustomerRepository customerRepository,
                      SupplierRepository supplierRepository,
                      SalesInvoiceRepository salesInvoiceRepository,
                      SalesItemRepository salesItemRepository,
                      PurchaseOrderRepository purchaseOrderRepository,
                      PurchaseOrderItemRepository purchaseOrderItemRepository,
                      PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.medicineRepository = medicineRepository;
        this.customerRepository = customerRepository;
        this.supplierRepository = supplierRepository;
        this.salesInvoiceRepository = salesInvoiceRepository;
        this.salesItemRepository = salesItemRepository;
        this.purchaseOrderRepository = purchaseOrderRepository;
        this.purchaseOrderItemRepository = purchaseOrderItemRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) {
        if (userRepository.count() == 0) {
            userRepository.save(new User("System Admin", "admin@pharmacy.local", passwordEncoder.encode("Admin@123"), "ADMIN"));
        }

        if (medicineRepository.count() == 0) {
            Medicine paracetamol = new Medicine();
            paracetamol.setName("Paracetamol");
            paracetamol.setGenericName("Acetaminophen");
            paracetamol.setBrand("Panadol");
            paracetamol.setCategory("Analgesic");
            paracetamol.setSku("PAN-001");
            paracetamol.setQuantityInStock(120);
            paracetamol.setReorderLevel(30);
            paracetamol.setUnitCost(new BigDecimal("0.45"));
            paracetamol.setUnitPrice(new BigDecimal("0.75"));
            paracetamol.setExpiryDate(LocalDate.now().plusYears(2));

            Medicine amoxicillin = new Medicine();
            amoxicillin.setName("Amoxicillin");
            amoxicillin.setGenericName("Amoxicillin");
            amoxicillin.setBrand("Amoxil");
            amoxicillin.setCategory("Antibiotic");
            amoxicillin.setSku("AMX-002");
            amoxicillin.setQuantityInStock(90);
            amoxicillin.setReorderLevel(25);
            amoxicillin.setUnitCost(new BigDecimal("1.10"));
            amoxicillin.setUnitPrice(new BigDecimal("1.90"));
            amoxicillin.setExpiryDate(LocalDate.now().plusYears(1));

            Medicine omeprazole = new Medicine();
            omeprazole.setName("Omeprazole");
            omeprazole.setGenericName("Omeprazole");
            omeprazole.setBrand("Losec");
            omeprazole.setCategory("Gastrointestinal");
            omeprazole.setSku("OME-003");
            omeprazole.setQuantityInStock(18);
            omeprazole.setReorderLevel(20);
            omeprazole.setUnitCost(new BigDecimal("0.70"));
            omeprazole.setUnitPrice(new BigDecimal("1.25"));
            omeprazole.setExpiryDate(LocalDate.now().plusMonths(9));

            Medicine ibuprofen = new Medicine();
            ibuprofen.setName("Ibuprofen");
            ibuprofen.setGenericName("Ibuprofen");
            ibuprofen.setBrand("Nurofen");
            ibuprofen.setCategory("Pain Relief");
            ibuprofen.setSku("IBU-004");
            ibuprofen.setQuantityInStock(65);
            ibuprofen.setReorderLevel(20);
            ibuprofen.setUnitCost(new BigDecimal("0.55"));
            ibuprofen.setUnitPrice(new BigDecimal("1.05"));
            ibuprofen.setExpiryDate(LocalDate.now().plusYears(2));

            Medicine cetirizine = new Medicine();
            cetirizine.setName("Cetirizine");
            cetirizine.setGenericName("Cetirizine");
            cetirizine.setBrand("Zyrtec");
            cetirizine.setCategory("Allergy");
            cetirizine.setSku("CET-005");
            cetirizine.setQuantityInStock(40);
            cetirizine.setReorderLevel(15);
            cetirizine.setUnitCost(new BigDecimal("0.80"));
            cetirizine.setUnitPrice(new BigDecimal("1.45"));
            cetirizine.setExpiryDate(LocalDate.now().plusMonths(12));

            Medicine vitaminD = new Medicine();
            vitaminD.setName("Vitamin D3");
            vitaminD.setGenericName("Cholecalciferol");
            vitaminD.setBrand("SunD3");
            vitaminD.setCategory("Supplements");
            vitaminD.setSku("VIT-006");
            vitaminD.setQuantityInStock(75);
            vitaminD.setReorderLevel(25);
            vitaminD.setUnitCost(new BigDecimal("0.90"));
            vitaminD.setUnitPrice(new BigDecimal("1.70"));
            vitaminD.setExpiryDate(LocalDate.now().plusYears(3));

            medicineRepository.saveAll(List.of(paracetamol, amoxicillin, omeprazole, ibuprofen, cetirizine, vitaminD));
        }

        if (customerRepository.count() == 0) {
            Customer c1 = new Customer();
            c1.setFullName("James Wilson");
            c1.setPhone("+44 7700 900123");
            c1.setEmail("james@sample.com");
            c1.setAddress("Manchester");
            c1.setCreditLimit(500.0);

            Customer c2 = new Customer();
            c2.setFullName("Sarah Green");
            c2.setPhone("+44 7788 123456");
            c2.setEmail("sarah@sample.com");
            c2.setAddress("Birmingham");
            c2.setCreditLimit(800.0);

            Customer c3 = new Customer();
            c3.setFullName("Daniel Moore");
            c3.setPhone("+44 7911 334455");
            c3.setEmail("daniel.moore@demo.com");
            c3.setAddress("Liverpool");
            c3.setCreditLimit(350.0);

            Customer c4 = new Customer();
            c4.setFullName("Emma Johnson");
            c4.setPhone("+44 7412 778899");
            c4.setEmail("emma@demo.com");
            c4.setAddress("Leeds");
            c4.setCreditLimit(900.0);

            customerRepository.saveAll(List.of(c1, c2, c3, c4));
        }

        if (supplierRepository.count() == 0) {
            Supplier s1 = new Supplier();
            s1.setName("UK Pharma Supply Ltd");
            s1.setContactPerson("Edward King");
            s1.setPhone("+44 161 555 1010");
            s1.setEmail("orders@ukpharmasupply.co.uk");
            s1.setAddress("Leeds, UK");

            Supplier s2 = new Supplier();
            s2.setName("North Field Medical");
            s2.setContactPerson("Maya Reed");
            s2.setPhone("+44 203 555 4455");
            s2.setEmail("sales@northfieldmedical.co.uk");
            s2.setAddress("London, UK");

            Supplier s3 = new Supplier();
            s3.setName("Green Valley Healthcare");
            s3.setContactPerson("Robert Shaw");
            s3.setPhone("+44 121 555 9988");
            s3.setEmail("support@greenvalleyhealth.co.uk");
            s3.setAddress("Birmingham, UK");

            supplierRepository.saveAll(List.of(s1, s2, s3));
        }

        if (salesInvoiceRepository.count() == 0) {
            List<Medicine> medicines = medicineRepository.findAll();
            List<Customer> customers = customerRepository.findAll();

            if (!medicines.isEmpty() && !customers.isEmpty()) {
                SalesInvoice paidInvoice = new SalesInvoice();
                paidInvoice.setCustomerId(customers.get(0).getId());
                paidInvoice.setInvoiceDate(LocalDate.now().minusDays(2));
                paidInvoice.setStatus("PAID");
                paidInvoice.setTotalAmount(new BigDecimal("18.50"));
                SalesInvoice savedPaidInvoice = salesInvoiceRepository.save(paidInvoice);

                SalesItem paidItem1 = new SalesItem();
                paidItem1.setSalesInvoiceId(savedPaidInvoice.getId());
                paidItem1.setMedicineId(medicines.get(0).getId());
                paidItem1.setQuantity(10);
                paidItem1.setUnitPrice(medicines.get(0).getUnitPrice());
                paidItem1.setTotalAmount(new BigDecimal("7.50"));
                salesItemRepository.save(paidItem1);

                SalesItem paidItem2 = new SalesItem();
                paidItem2.setSalesInvoiceId(savedPaidInvoice.getId());
                paidItem2.setMedicineId(medicines.get(3).getId());
                paidItem2.setQuantity(10);
                paidItem2.setUnitPrice(medicines.get(3).getUnitPrice());
                paidItem2.setTotalAmount(new BigDecimal("11.00"));
                salesItemRepository.save(paidItem2);

                SalesInvoice pendingInvoice = new SalesInvoice();
                pendingInvoice.setCustomerId(customers.get(1).getId());
                pendingInvoice.setInvoiceDate(LocalDate.now().minusDays(1));
                pendingInvoice.setStatus("PENDING");
                pendingInvoice.setTotalAmount(new BigDecimal("25.25"));
                SalesInvoice savedPendingInvoice = salesInvoiceRepository.save(pendingInvoice);

                SalesItem pendingItem = new SalesItem();
                pendingItem.setSalesInvoiceId(savedPendingInvoice.getId());
                pendingItem.setMedicineId(medicines.get(1).getId());
                pendingItem.setQuantity(8);
                pendingItem.setUnitPrice(medicines.get(1).getUnitPrice());
                pendingItem.setTotalAmount(new BigDecimal("15.20"));
                salesItemRepository.save(pendingItem);

                SalesItem pendingItem2 = new SalesItem();
                pendingItem2.setSalesInvoiceId(savedPendingInvoice.getId());
                pendingItem2.setMedicineId(medicines.get(4).getId());
                pendingItem2.setQuantity(7);
                pendingItem2.setUnitPrice(medicines.get(4).getUnitPrice());
                pendingItem2.setTotalAmount(new BigDecimal("10.05"));
                salesItemRepository.save(pendingItem2);

                SalesInvoice overdueInvoice = new SalesInvoice();
                overdueInvoice.setCustomerId(customers.get(2).getId());
                overdueInvoice.setInvoiceDate(LocalDate.now().minusDays(6));
                overdueInvoice.setStatus("OVERDUE");
                overdueInvoice.setTotalAmount(new BigDecimal("33.00"));
                SalesInvoice savedOverdueInvoice = salesInvoiceRepository.save(overdueInvoice);

                SalesItem overdueItem = new SalesItem();
                overdueItem.setSalesInvoiceId(savedOverdueInvoice.getId());
                overdueItem.setMedicineId(medicines.get(2).getId());
                overdueItem.setQuantity(12);
                overdueItem.setUnitPrice(medicines.get(2).getUnitPrice());
                overdueItem.setTotalAmount(new BigDecimal("15.00"));
                salesItemRepository.save(overdueItem);

                SalesItem overdueItem2 = new SalesItem();
                overdueItem2.setSalesInvoiceId(savedOverdueInvoice.getId());
                overdueItem2.setMedicineId(medicines.get(5).getId());
                overdueItem2.setQuantity(10);
                overdueItem2.setUnitPrice(medicines.get(5).getUnitPrice());
                overdueItem2.setTotalAmount(new BigDecimal("18.00"));
                salesItemRepository.save(overdueItem2);
            }
        }

        if (purchaseOrderRepository.count() == 0) {
            List<Medicine> medicines = medicineRepository.findAll();
            List<Supplier> suppliers = supplierRepository.findAll();

            if (!medicines.isEmpty() && !suppliers.isEmpty()) {
                PurchaseOrder purchaseOrder = new PurchaseOrder();
                purchaseOrder.setSupplierId(suppliers.get(0).getId());
                purchaseOrder.setOrderDate(LocalDate.now().minusDays(4));
                purchaseOrder.setStatus("RECEIVED");
                purchaseOrder.setTotalAmount(new BigDecimal("84.00"));
                PurchaseOrder savedPurchaseOrder = purchaseOrderRepository.save(purchaseOrder);

                PurchaseOrderItem purchaseOrderItem1 = new PurchaseOrderItem();
                purchaseOrderItem1.setPurchaseOrderId(savedPurchaseOrder.getId());
                purchaseOrderItem1.setMedicineId(medicines.get(0).getId());
                purchaseOrderItem1.setQuantity(50);
                purchaseOrderItem1.setUnitPrice(medicines.get(0).getUnitCost());
                purchaseOrderItem1.setTotalAmount(new BigDecimal("22.50"));
                purchaseOrderItemRepository.save(purchaseOrderItem1);

                PurchaseOrderItem purchaseOrderItem2 = new PurchaseOrderItem();
                purchaseOrderItem2.setPurchaseOrderId(savedPurchaseOrder.getId());
                purchaseOrderItem2.setMedicineId(medicines.get(2).getId());
                purchaseOrderItem2.setQuantity(35);
                purchaseOrderItem2.setUnitPrice(medicines.get(2).getUnitCost());
                purchaseOrderItem2.setTotalAmount(new BigDecimal("24.50"));
                purchaseOrderItemRepository.save(purchaseOrderItem2);

                PurchaseOrderItem purchaseOrderItem3 = new PurchaseOrderItem();
                purchaseOrderItem3.setPurchaseOrderId(savedPurchaseOrder.getId());
                purchaseOrderItem3.setMedicineId(medicines.get(5).getId());
                purchaseOrderItem3.setQuantity(40);
                purchaseOrderItem3.setUnitPrice(medicines.get(5).getUnitCost());
                purchaseOrderItem3.setTotalAmount(new BigDecimal("37.00"));
                purchaseOrderItemRepository.save(purchaseOrderItem3);
            }
        }
    }
}
