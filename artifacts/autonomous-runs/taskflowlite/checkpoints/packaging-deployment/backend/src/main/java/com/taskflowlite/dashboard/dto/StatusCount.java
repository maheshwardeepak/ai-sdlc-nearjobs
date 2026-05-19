package com.taskflowlite.dashboard.dto;

public class StatusCount {
    private String key;
    private Long count;

    public StatusCount(String key, Long count) {
        this.key = key;
        this.count = count;
    }

    public String getKey() { return key; }
    public Long getCount() { return count; }
}