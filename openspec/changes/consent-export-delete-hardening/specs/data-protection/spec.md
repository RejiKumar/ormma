# Spec Delta

## ADDED Requirements

### Requirement: Export and delete callables
Export SHALL be a callable function returning a parent's data as JSON for owners. Delete SHALL recursively delete the parent and storage files and write an auditLog entry with no health data.

#### Scenario: Owner exports
- **WHEN** an owner calls export
- **THEN** JSON of the parent's data is returned

#### Scenario: Owner deletes
- **WHEN** an owner calls delete
- **THEN** the parent and storage files are recursively deleted
- **AND** an auditLog entry is written with no health data
