# Delta spec: skin realism and portable sessions

Adds to the `tattoo-editor` capability. Existing requirements are unchanged.

## ADDED Requirements

### Requirement: Ink renders beneath the skin

A placed design MUST darken the skin it covers and MUST NOT add light to it.

#### Scenario: Ink never outshines the limb

- **Given** a design is placed on the model
- **When** the scene is rendered
- **Then** every covered pixel MUST be no brighter than the same pixel would be
  without the design

#### Scenario: Ink inherits the skin's lighting

- **Given** a design spans a lit region and a shaded region of the limb
- **When** the scene is rendered
- **Then** the design MUST appear darker in the shaded region
- **And** it MUST NOT be lit as an independent surface

#### Scenario: Pigment depth

- **Given** a design is selected
- **When** the user increases its ink depth
- **Then** the design MUST lose saturation
- **And** its darkest areas MUST shift toward the dermis tint rather than pure black

#### Scenario: Grazing angles still fade

- **Given** a design reaches a surface turning away from its projection axis
- **When** the scene is rendered
- **Then** the design MUST fade out before the projection stretch becomes visible

### Requirement: Adjustable skin tone

The system MUST let the user change the model's skin tone without replacing the
model's surface detail.

#### Scenario: Selecting a tone

- **Given** the editor is open
- **When** the user selects a skin tone
- **Then** the body model MUST re-render in that tone
- **And** the pores, veins and shading of the source texture MUST remain visible

#### Scenario: Tone does not leak between mounts

- **Given** the user has changed the skin tone
- **When** the user switches to another body part
- **Then** the newly loaded model MUST render in the selected tone
- **And** the underlying cached model asset MUST NOT be modified

### Requirement: Photo capture

The system MUST export the current view as a PNG image.

#### Scenario: Capturing the current view

- **Given** at least one design is placed
- **When** the user captures the view
- **Then** the system MUST download a PNG rendered from the current camera
- **And** the editor MUST return to its previous background and resolution

#### Scenario: Choosing a backdrop

- **Given** the user selects a backdrop of studio, white, black or transparent
- **When** a photo is captured
- **Then** the image MUST use that backdrop
- **And** a transparent backdrop MUST NOT include the ground shadow

#### Scenario: Capturing four angles

- **Given** at least one design is placed
- **When** the user captures four angles
- **Then** the system MUST download four PNGs taken at evenly spaced azimuths
- **And** the camera MUST end at the position it started from

#### Scenario: Nothing to photograph

- **Given** no design has been placed
- **When** the user looks at the capture controls
- **Then** capture MUST be unavailable

### Requirement: Portable sessions

The system MUST save a placement session to a file and restore it later.

#### Scenario: Saving

- **Given** designs are placed on the model
- **When** the user saves the session
- **Then** the system MUST download a single file containing the body part, skin
  tone, calibration, every design's placement, and the artwork itself

#### Scenario: Restoring

- **Given** a session file saved by this or an earlier version
- **When** the user opens it
- **Then** the editor MUST restore the body part, skin tone, calibration and every
  design at its recorded placement

#### Scenario: Rejecting a bad file

- **Given** a file that is not a valid session
- **When** the user opens it
- **Then** the system MUST report why
- **And** it MUST leave the current session untouched

### Requirement: Undo and redo

The system MUST let the user reverse and reapply document changes.

#### Scenario: Reversing an action

- **Given** the user has placed, moved, adjusted, deleted or retinted something
- **When** the user presses Ctrl+Z
- **Then** the editor MUST return to the state before that action

#### Scenario: Reapplying an action

- **Given** the user has undone an action
- **When** the user presses Ctrl+Y or Ctrl+Shift+Z
- **Then** the editor MUST reapply it

#### Scenario: A slider drag is one step

- **Given** the user drags a size, rotation, density or depth slider
- **When** the user then undoes once
- **Then** the editor MUST return to the value from before the drag began

#### Scenario: Undoing a deletion restores its artwork

- **Given** the user has deleted a placed design
- **When** the user undoes the deletion
- **Then** the design MUST reappear with its texture intact

#### Scenario: Text fields keep native undo

- **Given** the cursor is in the calibration field
- **When** the user presses Ctrl+Z
- **Then** the editor MUST NOT undo a document change

#### Scenario: Selection is not a document change

- **Given** the user selects a different design
- **When** the user presses Ctrl+Z
- **Then** the editor MUST undo the last real edit, not the selection
