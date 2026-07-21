## ADDED Requirements

### Requirement: All visible deletion actions require typed verification

The system SHALL require successful typed verification before any user-visible deletion action can resolve as confirmed and issue its DELETE request.

#### Scenario: Named resource deletion requests its visible identifier
- **WHEN** a user initiates deletion of a Prompt, solution, note, UI prototype, category, or tag
- **THEN** the confirmation dialog requires respectively the Prompt name, solution title, note title, UI prototype title, category name, or tag name
- **AND** no DELETE request is issued before that text is successfully verified

#### Scenario: Annotation deletion requests a fixed phrase
- **WHEN** a user initiates deletion of an annotation
- **THEN** the confirmation dialog requires the fixed text `删除批注`
- **AND** the dialog displays the related source excerpt only as target context rather than as required input

### Requirement: Verification controls the destructive action

The system SHALL display the expected confirmation text and SHALL keep the destructive confirmation action disabled until the entered text matches it after Unicode NFC normalization and removal of leading and trailing whitespace. Matching MUST remain case-sensitive and MUST preserve internal whitespace and punctuation.

#### Scenario: Entered text matches
- **WHEN** the normalized input equals the normalized expected confirmation text
- **THEN** the destructive confirmation button becomes enabled
- **AND** activating the button or pressing Enter resolves the confirmation as accepted

#### Scenario: Entered text does not match
- **WHEN** the normalized input differs by any case-sensitive character, internal whitespace, or punctuation
- **THEN** the destructive confirmation button remains disabled
- **AND** pressing Enter does not resolve the confirmation as accepted

#### Scenario: User pastes the expected text
- **WHEN** the user pastes text that satisfies the matching rule
- **THEN** the system accepts it in the same way as manually typed text

### Requirement: Verification state is isolated to one confirmation session

The system SHALL clear entered verification text whenever a confirmation is opened for a different target, cancelled, dismissed, or completed.

#### Scenario: User cancels a deletion
- **WHEN** the user enters any text and cancels or dismisses the deletion confirmation
- **THEN** the confirmation resolves as rejected
- **AND** the entered text is not present when another confirmation opens

#### Scenario: User opens another deletion after confirming one
- **WHEN** one deletion confirmation completes and a later deletion confirmation opens
- **THEN** the later confirmation starts with an empty input and validates against its own expected text

### Requirement: Deletion confirmations disclose actual impact

The system SHALL describe irreversible and cascading effects that are relevant to the selected deletion target before asking for typed verification.

#### Scenario: User deletes a Prompt
- **WHEN** the Prompt deletion confirmation is displayed
- **THEN** it states that the Prompt history versions and tag associations will also be deleted

#### Scenario: User deletes an annotated content resource
- **WHEN** a solution or note deletion confirmation is displayed
- **THEN** it states that all annotations belonging to that resource will also be deleted and cannot be recovered

#### Scenario: User deletes classification metadata
- **WHEN** a category or tag deletion confirmation is displayed
- **THEN** it states respectively that related Prompts become uncategorized or that Prompt-tag associations are removed

#### Scenario: User deletes an annotation
- **WHEN** the annotation deletion confirmation is displayed
- **THEN** it states that the annotation cannot be recovered and the Markdown source remains unchanged

### Requirement: Ordinary confirmations remain input-free

The system SHALL support confirmation dialogs without typed verification for non-deletion actions that use the existing generic confirmation flow.

#### Scenario: User confirms a Prompt version rollback
- **WHEN** a Prompt version rollback confirmation opens without verification configuration
- **THEN** the dialog does not render a verification input
- **AND** the existing confirm and cancel behavior remains available

### Requirement: Typed confirmation is keyboard and assistive-technology accessible

The system SHALL expose the confirmation as a modal dialog with an associated title and labeled verification input, SHALL focus the verification input when it appears, and SHALL allow Escape to cancel the confirmation.

#### Scenario: Typed deletion dialog opens
- **WHEN** a deletion confirmation containing verification opens
- **THEN** assistive technology can identify it as a modal dialog and associate its title and input label
- **AND** keyboard focus is placed in the verification input

#### Scenario: User presses Escape
- **WHEN** the confirmation dialog is open and the user presses Escape
- **THEN** the confirmation closes as cancelled and its verification input is cleared
