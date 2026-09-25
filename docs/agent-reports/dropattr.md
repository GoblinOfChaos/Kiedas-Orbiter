# Structural drop attribution report

The live bug path was verified from the cached Preview export: DropsAll names
the Zariman reward `Narin Chassis Blueprint`. `addNamedSource` did not match
that exact name, stripped ` Blueprint`, resolved `Narin Chassis`, and stored a
mission source without a component role. That made the source indistinguishable
from a frame-level route in acquisition rendering.

The fix builds component metadata from merged `ExportRecipes` and
`ExportResources`. Each recipe ingredient uniqueName is linked to its resource,
the resource description supplies the verified role, and the reward alias is
linked back to the parent recipe `resultType`. Component sources are stored on
that parent with `part`; the frame blueprint remains a separate unlabelled
route. Acquisition lookup includes both the result and blueprint identities so
callers using either DE key see the same structured data. Both drawers render
component sources in a labelled section.

Real merged-cache assertion passed for Narin: Chassis, Neuroptics, and Systems
component sources were found with their mission nodes/chances; the main
blueprint route was also present. Synthetic node:test coverage passed. The
existing completeness harness cannot pass Narin from its mirror-only fixture,
because Narin's recipe/resources are DE-only in this checkout; this remains an
open follow-up.
