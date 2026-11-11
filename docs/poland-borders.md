# Historical border overlay provenance

`src/data/poland-borders-1939.js` is a **generalized historical reference overlay**, intended to accompany the Poland campaign before the invasion on 1 September 1939. It depicts international boundary context, not military front lines, occupied areas, or the situation at the end of that day. It does not reuse the former hand-drawn `polandScenario.features`.

## Source and redistribution

Source: [CShapes 2.0, ETH Zürich International Conflict Research](https://icr.ethz.ch/data/cshapes/), downloaded 11 November 2026 from [the official GeoJSON](https://icr.ethz.ch/data/cshapes/CShapes-2.0.geojson). The official change log dates release 2.0 to 7 June 2020. The data's SHA-256 is embedded in `polandBorders1939.sources[0].sha256` so a future download can be checked against the exact source used.

Attribution: Schvitz, Guy; Seraina Rüegger; Luc Girardin; Lars-Erik Cederman; Nils Weidmann; Kristian Skrede Gleditsch. 2022. “Mapping The International System, 1886–2017: The CShapes 2.0 Dataset.” *Journal of Conflict Resolution* 66(1): 144–161.

The official dataset page explicitly licenses CShapes under [Creative Commons Attribution–NonCommercial–ShareAlike 4.0 International](https://creativecommons.org/licenses/by-nc-sa/4.0/). This simplified, clipped derivative is distributed under the **same CC BY-NC-SA 4.0** terms. The complete legal text is retained in [licenses/CC-BY-NC-SA-4.0.txt](licenses/CC-BY-NC-SA-4.0.txt). Attribution, a license link, and identification of the simplification/clipping changes must accompany redistribution. Commercial use is not authorized by this license. This notice applies to this geodata derivative; it does not relicense the application's independently written code. The current use is a noncommercial demonstration. Obtain suitable permission or replace these data before commercial distribution.

## Temporal limits: do not label as an exact daily reconstruction

Selection uses the integer `gwsyear/gwsmonth/gwsday` and `gweyear/gwemonth/gweday` fields, selecting records effective on **31 August 1939**, rather than parsing the timezone-shifted human date strings in the source. Every exported feature includes its actual `sourcePeriod`.

The [official codebook](https://icr.ethz.ch/data/cshapes/CShapes-2.0_Codebook.pdf), section “Coding Decisions”, says that changes below 10,000 square kilometres and some wartime changes reversed after the war were excluded. Its metadata consequently do not provide a detailed September 1939 snapshot:

- Poland's selected record spans 18 March 1921–7 May 1945. The full eastern outline and Polish corridor are retained, but the file cannot establish the precise 1938–1939 Zaolzie adjustments.
- Germany's selected record spans 30 September 1938–7 May 1945. Its separate East Prussian polygon is retained. This coding does not establish a complete March–August 1939 reconstruction, including the Memel change or Protectorate boundaries.
- Danzig has no record valid in 1939. We retain its last available separate polygon, whose source period is 28 June 1919–31 August 1938, to show the Free City's outline explicitly. **31 August 1938 is a source coding endpoint, not a claim that Germany annexed Danzig on that date.** Its geometry is a reference carried forward, not a same-date measurement.
- Lithuania, Latvia, the Soviet Union and Romania supply neighboring context. Their records inherit the same generalization and date limits. Southern neighboring states are not reconstructed as post-March-1939 state polygons; Poland's own perimeter still supplies the southern national-boundary outline.

Draw these as an explicitly generalized historical-border layer. Do not infer control, exact sovereignty on every small disputed parcel, or street-level accuracy from these polygons. A modern OSM background still contains modern borders and labels; the historical overlay does not transform that background into a 1939 map.

## Geometry processing and interface

`polandBorders1939` contains:

- `features`: `{id,name,role:'border',geometry:{type,coordinates},source,sourceName,sourcePeriod,temporalCaveat?}`. Coordinates use GeoJSON `[longitude, latitude]` in WGS84. Renderers must handle `LineString` and `MultiLineString`. `sourcePolygon` retains the original polygon type and component bounds for provenance; it is metadata, not rendered geometry.
- `sources`, `accuracy`, `note`, `referenceInstant`, and `processing` retain provenance, attribution and limitations for display/export.

Processing used Python Shapely 2.0.7: extract each selected source polygon’s boundary first, then intersect those lines with longitude 4–34°, latitude 43–61°; simplify with Douglas–Peucker tolerance **0.004 degrees**, preserving topology; snap coordinates to a **0.00001 degree** grid. These are angular tolerances, not a uniform distance guarantee. No border coordinates were manually drawn, and the Danzig polygon was not subtracted from other source geometries to invent a corrected 1939 ownership partition.

The clipping box lies outside the default campaign viewport. Because genuine polygon boundaries are extracted **before** clipping, the exported lines end at the clipping boundary without adding artificial straight box edges. Panning outside the campaign region therefore cannot expose a fabricated rectangular national boundary. Features retain source boundary geometry rather than forming a newly reconciled political partition.

Validation checks: all selected line geometries nonempty and valid after processing; coordinates finite and inside the clipping box; no line segment follows an artificial clipping-box edge; original Germany MultiPolygon component bounds retain the separate eastern component; Danzig remains separate; Poland retains points east of 28°E; output is below 500 KB. `tests/poland-borders.test.cjs` checks these shipped-data invariants. Browser rendering and projection are the map controller's separate responsibility.

## Optional German and Polish area tint

Only the `germany` and `poland` features additionally provide `fillGeometry` (`Polygon` or `MultiPolygon`) for a light background tint. These use the same selected original CShapes records and license: clip the original polygon to the processing box, simplify at 0.004 degrees with topology preserved, and snap to 0.00001 degrees. Germany retains its separate East Prussian component, and Poland retains its eastern territory. The existing `geometry` boundary lines remain unchanged.

The tint represents generalized **pre-invasion national-territory context**, with all date and source conflicts above still applying. It is not a dynamic area of military control, a front line, a verified September 1939 occupation zone, or evidence that an entire colored area was held by a particular army. No attempt is made to invent corrected 1939 ownership parcels where the source coding is incomplete or overlapping. In particular, independently shown Danzig does not resolve the underlying source's political-partition limitations.

`fillGeometry` is for fill only: do not stroke its polygon perimeter. Clipping polygons can create straight box edges; genuine national outlines must continue to use the separately supplied `geometry`, which was extracted before clipping. The derivative attribution and CC BY-NC-SA 4.0 restrictions apply equally to these additional polygons.
