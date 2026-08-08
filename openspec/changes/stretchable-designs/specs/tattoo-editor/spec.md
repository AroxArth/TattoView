# Delta spec: stretchable designs

Modifies the `tattoo-editor` capability. Replaces the single-dimension sizing
behaviour with independent width and height.

## MODIFIED Requirements

### Requirement: Real-world size calibration

The system MUST report design dimensions in centimetres only when the user has
supplied a real reference measurement, and MUST report width and height separately.

#### Scenario: Calibration provided

- **Given** the user has entered the real length of the displayed body part
- **When** a design is selected
- **Then** the system MUST display the design's width and height in centimetres
- **And** each MUST reflect that dimension's own value, not one derived from the other

#### Scenario: Calibration missing

- **Given** no reference measurement has been entered
- **When** a design is selected
- **Then** the system MUST NOT display any centimetre value
- **And** it MUST NOT substitute an estimated or default measurement

## ADDED Requirements

### Requirement: Independent width and height

The system MUST let the user set a design's width and height independently.

#### Scenario: Stretching

- **Given** a design is placed and the proportions lock is off
- **When** the user changes its height
- **Then** the design MUST render at the new height
- **And** its width MUST NOT change

#### Scenario: Proportional scaling

- **Given** a design is placed and the proportions lock is on
- **When** the user changes one dimension
- **Then** the other MUST change by the same factor

#### Scenario: Locking preserves a deliberate stretch

- **Given** the user has stretched a design with the lock off
- **When** the user turns the lock on and scales it
- **Then** the stretched ratio MUST be preserved
- **And** the design MUST NOT snap back to the file's ratio

#### Scenario: Restoring the original ratio

- **Given** a stretched design
- **When** the user restores its proportions
- **Then** its height MUST return to the file's intrinsic ratio for its current width

#### Scenario: A linked dimension reaching its limit

- **Given** the lock is on and the linked dimension would exceed the allowed range
- **When** the user keeps scaling
- **Then** the linked dimension MUST stop at the limit
- **And** it MUST NOT take a value outside the range its control can show

#### Scenario: A tall design still wraps

- **Given** a design stretched taller than it is wide
- **When** the scene is rendered
- **Then** the design MUST project over its full height without clipping

#### Scenario: Grabbing a stretched design

- **Given** a design stretched well beyond its original ratio
- **When** the user double clicks it
- **Then** the grab area MUST follow its current dimensions

#### Scenario: Stretch survives a session round-trip

- **Given** a stretched design
- **When** the session is saved and reopened
- **Then** the design MUST keep both dimensions and its lock state

#### Scenario: Sessions saved before stretching existed

- **Given** a session file with no recorded height
- **When** it is opened
- **Then** each design MUST be shown at its file's intrinsic ratio
