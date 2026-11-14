package com.pharmacy.config;

import com.pharmacy.entity.*;
import com.pharmacy.repository.*;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Component
public class DataSeeder implements CommandLineRunner {

    private final UserRepository userRepository;
    private final MedicineRepository medicineRepository;
    private final CustomerRepository customerRepository;
    private final SupplierRepository supplierRepository;
    private final PasswordEncoder passwordEncoder;

    public DataSeeder(UserRepository userRepository,
                      MedicineRepository medicineRepository,
                      CustomerRepository customerRepository,
                      SupplierRepository supplierRepository,
                      PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.medicineRepository = medicineRepository;
        this.customerRepository = customerRepository;
        this.supplierRepository = supplierRepository;
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

            medicineRepository.saveAll(List.of(paracetamol, amoxicillin, omeprazole));
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

            customerRepository.saveAll(List.of(c1, c2));
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

            supplierRepository.saveAll(List.of(s1, s2));
        }
    }
}
