# Delta Spec — Tattoo Editor

## ADDED Requirements

### Requirement: Body model selection

The system MUST offer at least one anatomical body model and MUST render it with
its authored skin material.

#### Scenario: Default model on load

- **Given** the user opens the editor
- **When** the application finishes loading
- **Then** the forearm model MUST be displayed
- **And** the model MUST stand along the vertical axis, centred in the viewport

#### Scenario: Switching body part

- **Given** a model is displayed with one or more placed designs
- **When** the user selects a different body part
- **Then** the new model MUST be displayed
- **And** all placed designs MUST be discarded, because placement coordinates are
  only meaningful on the limb they were recorded against

### Requirement: Model asset compatibility

Every bundled model MUST load in three.js without a required glTF extension the
runtime cannot satisfy.

#### Scenario: Source model uses a deprecated extension

- **Given** a source asset declares `KHR_materials_pbrSpecularGlossiness` in
  `extensionsRequired`
- **When** it is processed by the asset pipeline
- **Then** the extension MUST be converted to metallic-roughness
- **And** the published `.glb` MUST NOT require any extension unsupported by three.js

### Requirement: Design upload

The system MUST accept PNG, WebP and JPEG designs and MUST preserve their aspect
ratio.

#### Scenario: Valid design selected

- **Given** the user selects a PNG, WebP or JPEG file
- **When** the file is read
- **Then** the system MUST open a preview before adding it to the design list

#### Scenario: Unsupported file selected

- **Given** the user selects a file of any other type
- **When** the upload is attempted
- **Then** the system MUST reject it with an explanatory message
- **And** the design list MUST remain unchanged

### Requirement: Upload confirmation preview

The system MUST NOT add a design to the editor until the user confirms it.

#### Scenario: Confirming a design

- **Given** the preview is open
- **When** the user accepts
- **Then** the design MUST be added to the design list
- **And** the system MUST prompt the user to place it on the model

#### Scenario: Cancelling a design

- **Given** the preview is open
- **When** the user cancels
- **Then** the design MUST NOT be added
- **And** any object URL created for the preview MUST be released

#### Scenario: Format without an alpha channel

- **Given** the selected file is a JPEG
- **When** the preview opens
- **Then** the system MUST warn that the design will render as a solid rectangle
  unless the background is removed
- **And** background removal MUST be enabled by default

### Requirement: Background removal

The system MUST offer background removal inside the preview, with a live result
and an adjustable tolerance.

#### Scenario: Removing a flat background

- **Given** a design on a flat background is being previewed
- **When** the user enables background removal
- **Then** pixels matching the sampled background colour MUST become transparent
- **And** the preview MUST show the result over a transparency checkerboard

#### Scenario: Preserving pale artwork colours

- **Given** a design contains colours close in brightness to the background
- **When** background removal runs at the default tolerance
- **Then** those pixels MUST remain visible, because transparency MUST be decided
  by colour distance from the sampled background rather than by brightness

#### Scenario: Adjusting tolerance

- **Given** background removal is enabled
- **When** the user changes the tolerance
- **Then** the preview MUST update to reflect the new value before acceptance

### Requirement: Surface-conforming placement

A design MUST be projected onto the body geometry, not composited as a flat overlay.

#### Scenario: Placing a design on the skin

- **Given** a design is selected and placement mode is active
- **When** the user clicks a point on the model
- **Then** the design MUST be projected at that point
- **And** its orientation MUST follow the surface normal at the point of contact
- **And** the projection depth MUST NOT reach the opposite side of the limb

#### Scenario: Surface curving away from the projection axis

- **Given** a design is projected onto a curved limb
- **When** part of the surface turns away from the projection axis
- **Then** the design MUST fade out before it smears
- **And** it MUST NOT streak around the silhouette of the limb

#### Scenario: Default heading of a placed design

- **Given** a design is placed on a surface that does not face along the limb axis
- **When** its rotation has not been adjusted
- **Then** the design MUST read upright along the limb's long axis
- **And** its heading MUST NOT vary with the surface angle

### Requirement: Repositioning a placed design

The system MUST let the user move and rotate a design after it has been placed.

#### Scenario: Grabbing a design

- **Given** a design is placed on the model
- **When** the user double clicks it
- **Then** the design MUST be selected and follow subsequent pointer movement
- **And** it MUST re-orient to the surface normal under the pointer
- **And** camera orbit MUST be suspended until the design is dropped

#### Scenario: Single click does not grab

- **Given** a design is placed on the model
- **When** the user single clicks it
- **Then** the design MUST NOT move, because an accidental click must never
  displace committed work

#### Scenario: Dropping and cancelling

- **Given** a design is being moved
- **When** the user clicks the model, or presses Escape
- **Then** the move MUST end
- **And** camera orbit MUST be restored

#### Scenario: Rotating a design

- **Given** a design is selected
- **When** the user changes its rotation
- **Then** the design MUST rotate around its surface normal
- **And** its anchor point MUST NOT move

#### Scenario: Overlapping designs

- **Given** a small design is placed on top of a larger one
- **When** the user presses where both overlap
- **Then** the smaller design MUST be the one grabbed

### Requirement: Real-world size calibration

The system MUST report design dimensions in centimetres only when the user has
supplied a real reference measurement.

#### Scenario: Calibration provided

- **Given** the user has entered the real length of the displayed body part
- **When** a design is selected
- **Then** the system MUST display the design's width and height in centimetres

#### Scenario: Calibration missing

- **Given** no reference measurement has been entered
- **When** a design is selected
- **Then** the system MUST NOT display any centimetre value
- **And** it MUST NOT substitute an estimated or default measurement

### Requirement: Attribution of licensed models

The system MUST display author credit for every bundled CC-BY model.

#### Scenario: Viewing credits

- **Given** the editor is open
- **When** the user opens the model credits
- **Then** the system MUST show, for each model, its title, author, source link,
  and license with a link to the license text
