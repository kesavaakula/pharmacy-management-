package com.pharmacy.controller;

import com.pharmacy.entity.Customer;
import com.pharmacy.repository.CustomerRepository;
import com.pharmacy.repository.SalesInvoiceRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
public class CustomerController {

    private final CustomerRepository customerRepository;

    private final SalesInvoiceRepository salesInvoiceRepository;

    public CustomerController(CustomerRepository customerRepository, SalesInvoiceRepository salesInvoiceRepository) {
        this.customerRepository = customerRepository;
        this.salesInvoiceRepository = salesInvoiceRepository;
    }

    @GetMapping("/customers")
    public List<Customer> listCustomers() {
        return customerRepository.findAll();
    }

    @GetMapping("/customers/{id}")
    public ResponseEntity<Customer> getCustomer(@PathVariable Long id) {
        return customerRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/customers")
    public ResponseEntity<Customer> createCustomer(@RequestBody Customer customer) {
        return ResponseEntity.ok(customerRepository.save(customer));
    }

    @PutMapping("/customers/{id}")
    public ResponseEntity<Customer> updateCustomer(@PathVariable Long id, @RequestBody Customer updatedCustomer) {
        return customerRepository.findById(id)
                .map(existing -> {
                    existing.setFullName(updatedCustomer.getFullName());
                    existing.setPhone(updatedCustomer.getPhone());
                    existing.setEmail(updatedCustomer.getEmail());
                    existing.setAddress(updatedCustomer.getAddress());
                    existing.setDateOfBirth(updatedCustomer.getDateOfBirth());
                    if (updatedCustomer.getCreditLimit() != null) {
                        existing.setCreditLimit(updatedCustomer.getCreditLimit());
                    }
                    return ResponseEntity.ok(customerRepository.save(existing));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/customers/{id}")
    public ResponseEntity<Void> deleteCustomer(@PathVariable Long id) {
        if (customerRepository.existsById(id)) {
            if (salesInvoiceRepository.existsByCustomerId(id)) {
                throw new IllegalArgumentException("This customer has invoices and cannot be deleted");
            }
            customerRepository.deleteById(id);
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.notFound().build();
    }
}
