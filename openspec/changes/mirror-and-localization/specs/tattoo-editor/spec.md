# Delta spec: mirroring and Spanish-first localization

Adds to the `tattoo-editor` capability. Existing requirements are unchanged.

## ADDED Requirements

### Requirement: Mirrored designs

The system MUST let the user flip a design horizontally without re-uploading it.

#### Scenario: Flipping a placed design

- **Given** a design is placed on the model
- **When** the user turns on mirror
- **Then** the design MUST render horizontally reversed
- **And** its anchor point, size and rotation MUST NOT change

#### Scenario: The projection is unaffected

- **Given** a design is mirrored
- **When** the scene is rendered
- **Then** the design MUST still wrap the surface exactly as it did before
- **And** it MUST NOT be projected from the opposite side of the limb

#### Scenario: Mirroring is reversible

- **Given** the user has mirrored a design
- **When** the user turns mirror off, or presses Ctrl+Z
- **Then** the design MUST return to its original orientation

#### Scenario: Mirroring survives a session round-trip

- **Given** a mirrored design
- **When** the session is saved and reopened
- **Then** the design MUST still be mirrored

### Requirement: Interface language

The system MUST present its entire interface in Spanish by default and MUST let the
user switch to English.

#### Scenario: First visit

- **Given** a user who has never chosen a language
- **When** the editor loads
- **Then** every label, hint, message and error MUST be in Spanish
- **And** the browser's reported language MUST NOT change that

#### Scenario: Switching language

- **Given** the editor is open
- **When** the user selects English
- **Then** every label, hint, message and error MUST switch to English
- **And** the document language MUST be updated for assistive technology

#### Scenario: The choice is remembered

- **Given** the user has selected a language
- **When** the user reloads the app
- **Then** the selected language MUST still be in effect

#### Scenario: Errors raised deep in the app are translated

- **Given** the user opens an invalid session file
- **When** the error is shown
- **Then** the message MUST be in the selected language

#### Scenario: Attribution stays verbatim

- **Given** the credits dialog is open in any language
- **When** the user reads a model's attribution
- **Then** the model title, author name and license name MUST appear exactly as
  published by their authors

### Requirement: Translation integrity

The system MUST NOT ship an incomplete or inconsistent dictionary.

#### Scenario: A missing translation

- **Given** a key exists in the source language but not in the other
- **When** the project is built
- **Then** the build MUST fail

#### Scenario: A placeholder present in one language only

- **Given** a string uses `{count}` in one language and not in the other
- **When** translation integrity is verified
- **Then** verification MUST fail and name the key

#### Scenario: A body part or skin tone without translations

- **Given** an entry whose id has no matching dictionary keys
- **When** translation integrity is verified
- **Then** verification MUST fail and name the id
