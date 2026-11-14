package com.pharmacy.dto;

public record AuthResponse(String token, String type, String name, String role) {
}
