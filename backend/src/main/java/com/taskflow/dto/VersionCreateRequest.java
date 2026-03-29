package com.taskflow.dto;

public record VersionCreateRequest(
        String definition,
        String changelog
) {}
