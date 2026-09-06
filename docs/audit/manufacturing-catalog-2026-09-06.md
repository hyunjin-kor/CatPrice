# Manufacturing catalog audit — 2026-09-06

The catalog has 28 named thermal routes, one empty custom thermal route, and five electrode routes (34 total). The table is generated from bundled templates and the same `template_costs` function as `GET /api/templates/costs`. Costs use the latest bundled ChemPPI target year, the published 2017 Step Method basis, and the stated 2/20/200 ton production sizes. They exclude materials, overhead, margin, and explicitly uncosted operations. Source text and links are recorded as supplied; URL/DOI validity is audited separately in `docs/sources/provenance-2026-09-06.md`.

| ID | Name | Steps (with repetitions) | 2 t $/lb | 20 t $/lb | 200 t $/lb | Source label | URLs | Uncosted operations |
|---|---|---:|---:|---:|---:|---|---:|---|
| `colloidal_nanoparticle_deposition` | Colloidal / Polyol Nanoparticle Synthesis with Deposition | 6 | 8.9773 | 1.7955 | 0.3398 | Munnik, de Jongh and de Jong, Recent developments in the synthesis of supported catalysts, Chem. Rev. 115, 6687 (2015); Yang and Kuwahara, PdAg alloy nanoparticles in N-doped carbon, Appl. Catal. B 283, 119628 (2021) | 2 | None listed |
| `combustion_synthesis_mixed_oxide` | Solution Combustion Synthesis - Mixed Oxide | 5 | 6.6831 | 1.4364 | 0.2281 | Avgouropoulos and Ioannides, urea-nitrate combustion synthesis of CuO-CeO2, Appl. Catal. A 244, 155 (2003); Campanati, Fornasari and Vaccari, Fundamentals in the preparation of heterogeneous catalysts, Catal. Today 77, 299 (2003) | 2 | None listed |
| `coprecipitation_metal_oxide` | Co-precipitation - Metal on Oxide Support | 7 | 8.7778 | 1.8194 | 0.3212 | Co-precipitation, impregnation and sol-gel preparation of Ni catalysts for pyrolysis-catalytic steam reforming of waste plastics, Appl. Catal. B 239, 565 (2018) | 1 | None listed |
| `deposition_precipitation_metal_oxide` | Deposition-Precipitation - Metal on Oxide Support | 7 | 10.1743 | 2.0947 | 0.3957 | Geus and van Dillen, Preparation of supported catalysts by deposition-precipitation, Handbook of Heterogeneous Catalysis (2008); Haruta, Catal. Today 36, 153 (1997); Munnik, de Jongh and de Jong, Recent developments in the synthesis of supported catalysts, Chem. Rev. 115, 6687 (2015) | 3 | None listed |
| `excess_solution_impregnation_metal_oxide` | Excess-Solution (Wet) Impregnation - Metal on Oxide Support | 7 | 8.7778 | 1.8194 | 0.3212 | Jimenez et al., Industrial Catalyst Impregnation: Modern Equipment, Techniques, and Scaling Challenges, Ind. Eng. Chem. Res. 65, 12447 (2026) | 1 | None listed |
| `fcc_catalyst_usy_w_re` | FCC Catalyst (USY w/ RE) | 25 | 32.3183 | 6.7390 | 1.3546 | CatCost_v1-1-1.xlsx, 3a Step Method sheet | 0 | None listed |
| `fusion_promoted_magnetite` | Oxide-Melt Fusion - Promoted Magnetite | 4 | 4.0897 | 1.1611 | 0.1862 | Kandemir et al., Angew. Chem. Int. Ed. 52, 12723 (2013); Appl, Ammonia, Ullmann's Encyclopedia of Industrial Chemistry (2011); Liu, Ammonia Synthesis Catalysts, World Scientific (2013) | 3 | Electric fusion furnace (~1600 C melt): costed at the direct-fired kiln rate; Sieving to 1.5-3 mm grains: costed at the mill rate |
| `hydrothermal_oxide_nanostructure` | Hydrothermal / Solvothermal Synthesis - Bulk Oxide | 6 | 9.4760 | 1.9750 | 0.3026 | Campanati, Fornasari and Vaccari, Fundamentals in the preparation of heterogeneous catalysts, Catal. Today 77, 299 (2003); Perego and Villa, Catalyst preparation methods, Catal. Today 34, 281 (1997) | 2 | Pressure autoclave (120-250 C, autogenous pressure): costed at the crystallizer rate; there is no pressure-vessel rate in the Step Library |
| `ion_exchange_zeolite_metal` | Ion Exchange - Metal into Zeolite | 6 | 7.6806 | 1.5441 | 0.2839 | Perego and Villa, Catalyst preparation methods, Catal. Today 34, 281 (1997); Beale et al., Cu-chabazite as the deployed diesel DeNOx catalyst, Top. Catal. 56, 1441 (2013) | 2 | None listed |
| `magnesia_alumina` | Magnesia/Alumina | 11 | 16.2589 | 3.4952 | 0.5446 | CatCost_v1-1-1.xlsx, 3a Step Method sheet | 0 | None listed |
| `metal_carbide_bulk` | Metal Carbide (Bulk) | 9 | 12.6680 | 2.7530 | 0.4283 | CatCost_v1-1-1.xlsx, 3a Step Method sheet | 0 | None listed |
| `metal_carbide_on_metal_oxide` | Metal Carbide on Metal Oxide | 10 | 13.7652 | 2.8967 | 0.4655 | CatCost_v1-1-1.xlsx, 3a Step Method sheet | 0 | None listed |
| `metal_earth_abundant_on_metal_oxide` | Metal (Earth Abundant) on Metal Oxide | 9 | 13.1667 | 2.8727 | 0.4422 | CatCost_v1-1-1.xlsx, 3a Step Method sheet | 0 | None listed |
| `metal_pgm_carbon` | PGM on Carbon Support | 4 | 5.4861 | 0.9576 | 0.1676 | Jimenez et al., Industrial Catalyst Impregnation: Modern Equipment, Techniques, and Scaling Challenges, Ind. Eng. Chem. Res. 65, 12447 (2026) | 1 | None listed |
| `metal_pgm_on_carbon` | Metal (PGM) on Carbon | 6 | 7.7803 | 1.4603 | 0.3165 | CatCost_v1-1-1.xlsx, 3a Step Method sheet | 0 | None listed |
| `metal_pgm_on_metal_oxide` | Metal (PGM) on Metal Oxide | 8 | 12.6680 | 2.5136 | 0.3957 | CatCost_v1-1-1.xlsx, 3a Step Method sheet | 0 | None listed |
| `reduction_activation_addon` | Activation - Gas-Phase Reduction (H2) | 2 | 2.4937 | 0.5985 | 0.0884 | Munnik, de Jongh and de Jong, Recent developments in the synthesis of supported catalysts, Chem. Rev. 115, 6687 (2015) | 1 | Hydrogen reduction furnace: costed at the indirect kiln rate |
| `shaping_extrusion_pelletizing` | Shaping - Extrudates, Pellets and Spheres | 4 | 6.9823 | 1.4962 | 0.2327 | Perego and Villa, Catalyst preparation methods, Catal. Today 34, 281 (1997); Campanati, Fornasari and Vaccari, Fundamentals in the preparation of heterogeneous catalysts, Catal. Today 77, 299 (2003); commercial Ni/calcium-aluminate reforming rings, Energies 13, 2792 (2020) | 3 | None listed |
| `sol_gel_metal_oxide` | Sol-Gel - Metal on Oxide Support | 6 | 8.1793 | 1.7356 | 0.3212 | Co-precipitation, impregnation and sol-gel preparation of Ni catalysts for pyrolysis-catalytic steam reforming of waste plastics, Appl. Catal. B 239, 565 (2018) | 1 | None listed |
| `solid_state_mechanochemical` | Solid-State / Mechanochemical Synthesis - Bulk Oxide or Nitride | 4 | 4.4887 | 1.1371 | 0.1722 | Campanati, Fornasari and Vaccari, Fundamentals in the preparation of heterogeneous catalysts, Catal. Today 77, 299 (2003); Wang et al., Nature Mater. 7, 76 (2008), g-C3N4; Grant et al., Science 354, 1570 (2016), boron nitride | 3 | None listed |
| `sulfidation_hydrotreating` | Impregnation with Sulfidation - Hydrotreating Catalysts | 7 | 10.0745 | 2.1186 | 0.3445 | Eijsbouts, On the flexibility of the active phase in hydrotreating catalysts, Appl. Catal. A 158, 53 (1997); Song et al., CoMoS nanosulfide for HDO, ACS Catal. 8, 11577 (2018) | 2 | Gas-phase sulfiding (H2S/H2 or DMDS): costed at the simple-reactor rate |
| `washcoat_monolith` | Washcoating - Catalyst on Monolith / Honeycomb | 4 | 5.9849 | 1.2568 | 0.1909 | Nijhuis, Beers, Vergunst et al., Preparation of monolithic catalysts, Catal. Rev. 43, 345 (2001); Beale et al., Top. Catal. 56, 1441 (2013) | 2 | Dip-coating or vacuum-assisted coating line: no Step Library rate, the coating pass is not costed; Honeycomb substrate (cordierite or metal foil) enters as a material, not a step |
| `wet_impregnation_metal_oxide` | Incipient Wetness Impregnation - Metal on Oxide Support | 6 | 8.1793 | 1.6758 | 0.2653 | Jimenez et al., Industrial Catalyst Impregnation: Modern Equipment, Techniques, and Scaling Challenges, Ind. Eng. Chem. Res. 65, 12447 (2026) | 1 | None listed |
| `zeolite_beta_bulk` | Zeolite Beta (Bulk) | 14 | 20.3486 | 4.4767 | 0.7774 | CatCost_v1-1-1.xlsx, 3a Step Method sheet | 0 | None listed |
| `zeolite_beta_with_metal_active_site` | Zeolite Beta with Metal Active Site | 17 | 25.3360 | 5.4941 | 0.9310 | CatCost_v1-1-1.xlsx, 3a Step Method sheet | 0 | None listed |
| `zeolite_fcc` | FCC Catalyst (Zeolite-based) | 7 | 8.7778 | 2.2982 | 0.3817 | Vogt & Weckhuysen, Fluid catalytic cracking: recent developments on the grand old lady of zeolite catalysis, Chem. Soc. Rev. 44, 7342-7370 (2015) | 1 | None listed |
| `zeolite_zsm_5_2025_pct` | Zeolite ZSM-5 (20–25%) | 16 | 25.2362 | 4.9315 | 0.9170 | CatCost_v1-1-1.xlsx, 3a Step Method sheet | 0 | None listed |
| `zeolite_zsm_5_bulk` | Zeolite ZSM-5 (Bulk) | 15 | 23.7400 | 4.9315 | 0.8984 | CatCost_v1-1-1.xlsx, 3a Step Method sheet | 0 | None listed |

## Empty custom and electrode entries

| ID | Domain | Application | Steps | Source URLs |
|---|---|---|---:|---:|
| `aem_fuel_cell_ccm` | electrocatalyst | fuel_cell | 9 | 3 |
| `alkaline_electrolyzer_gde` | electrocatalyst | electrolyzer | 9 | 3 |
| `custom_step_process` | thermal | general | 0 | 0 |
| `dmfc_gde_route` | electrocatalyst | direct_methanol_fuel_cell | 8 | 2 |
| `pem_electrolyzer_ccm` | electrocatalyst | electrolyzer | 8 | 3 |
| `pem_fuel_cell_ccm` | electrocatalyst | fuel_cell | 8 | 3 |

## Steps and scale substitutions

Repeated keys represent repeated operations; they must not be deduplicated. All 28 thermal routes retain every priced operation after scale fitting. Missing public permalinks on legacy rows remain explicitly missing; this audit does not create citations or new rate data.

### colloidal_nanoparticle_deposition

Original steps: mixer_slurry, reactor_multistep, filter_rotary_vacuum, dryer_rotary_40_100C, kiln_continuous_indirect, mill.

- 2 t: filter_rotary_vacuum → filter_plate_frame; kiln_continuous_indirect → kiln_batch.
- 20 t: No equipment substitution.
- 200 t: No equipment substitution.

### combustion_synthesis_mixed_oxide

Original steps: mixer_slurry, dryer_rotary_100_300C, kiln_continuous_indirect, mill, scrubber_nox.

- 2 t: kiln_continuous_indirect → kiln_batch.
- 20 t: No equipment substitution.
- 200 t: No equipment substitution.

### coprecipitation_metal_oxide

Original steps: mixer_slurry, reactor_simple, filter_rotary_vacuum, dryer_rotary_100_300C, kiln_continuous_indirect, mill, scrubber_nox.

- 2 t: filter_rotary_vacuum → filter_plate_frame; kiln_continuous_indirect → kiln_batch.
- 20 t: No equipment substitution.
- 200 t: No equipment substitution.

### deposition_precipitation_metal_oxide

Original steps: mixer_slurry, reactor_multistep, filter_rotary_vacuum, dryer_rotary_100_300C, kiln_continuous_indirect, mill, scrubber_nox.

- 2 t: filter_rotary_vacuum → filter_plate_frame; kiln_continuous_indirect → kiln_batch.
- 20 t: No equipment substitution.
- 200 t: No equipment substitution.

### excess_solution_impregnation_metal_oxide

Original steps: mixer_slurry, reactor_simple, filter_rotary_vacuum, dryer_rotary_100_300C, kiln_continuous_indirect, mill, scrubber_nox.

- 2 t: filter_rotary_vacuum → filter_plate_frame; kiln_continuous_indirect → kiln_batch.
- 20 t: No equipment substitution.
- 200 t: No equipment substitution.

### fcc_catalyst_usy_w_re

Original steps: reactor_simple, crystallizer, crystallizer, filter_rotary_vacuum, filter_rotary_vacuum, filter_rotary_vacuum, filter_rotary_vacuum, reactor_simple, reactor_simple, reactor_simple, reactor_simple, kiln_continuous_indirect, reactor_multistep, filter_rotary_vacuum, reactor_multistep, mixer_slurry, mixer_slurry, dryer_spray, reactor_simple, reactor_simple, reactor_simple, reactor_simple, filter_rotary_vacuum, filter_rotary_vacuum, dryer_rotary_100_300C.

- 2 t: filter_rotary_vacuum → filter_plate_frame; filter_rotary_vacuum → filter_plate_frame; filter_rotary_vacuum → filter_plate_frame; filter_rotary_vacuum → filter_plate_frame; kiln_continuous_indirect → kiln_batch; filter_rotary_vacuum → filter_plate_frame; dryer_spray → dryer_rotary_100_300C; filter_rotary_vacuum → filter_plate_frame; filter_rotary_vacuum → filter_plate_frame.
- 20 t: No equipment substitution.
- 200 t: No equipment substitution.

### fusion_promoted_magnetite

Original steps: mixer_dry_blender, kiln_continuous_direct, mill, reactor_simple.

- 2 t: kiln_continuous_direct → kiln_batch.
- 20 t: No equipment substitution.
- 200 t: No equipment substitution.

### hydrothermal_oxide_nanostructure

Original steps: mixer_slurry, crystallizer, filter_rotary_vacuum, dryer_rotary_100_300C, kiln_continuous_indirect, mill.

- 2 t: filter_rotary_vacuum → filter_plate_frame; kiln_continuous_indirect → kiln_batch.
- 20 t: No equipment substitution.
- 200 t: No equipment substitution.

### ion_exchange_zeolite_metal

Original steps: mixer_slurry, reactor_simple, reactor_simple, filter_rotary_vacuum, dryer_rotary_100_300C, kiln_continuous_indirect.

- 2 t: filter_rotary_vacuum → filter_plate_frame; kiln_continuous_indirect → kiln_batch.
- 20 t: No equipment substitution.
- 200 t: No equipment substitution.

### magnesia_alumina

Original steps: reactor_simple, crystallizer, crystallizer, filter_rotary_vacuum, dryer_rotary_100_300C, kiln_continuous_indirect, scrubber_nox, crystallizer, filter_rotary_vacuum, dryer_rotary_40_100C, mill.

- 2 t: filter_rotary_vacuum → filter_plate_frame; kiln_continuous_indirect → kiln_batch; filter_rotary_vacuum → filter_plate_frame.
- 20 t: No equipment substitution.
- 200 t: No equipment substitution.

### metal_carbide_bulk

Original steps: mill, kiln_continuous_indirect, kiln_continuous_indirect, scrubber_nox, crystallizer, filter_rotary_vacuum, dryer_rotary_40_100C, flare, dryer_rotary_100_300C.

- 2 t: kiln_continuous_indirect → kiln_batch; kiln_continuous_indirect → kiln_batch; filter_rotary_vacuum → filter_plate_frame.
- 20 t: No equipment substitution.
- 200 t: No equipment substitution.

### metal_carbide_on_metal_oxide

Original steps: reactor_simple, incipient_wetness, kiln_continuous_indirect, scrubber_nox, crystallizer, filter_rotary_vacuum, dryer_rotary_40_100C, kiln_continuous_indirect, flare, dryer_rotary_100_300C.

- 2 t: kiln_continuous_indirect → kiln_batch; filter_rotary_vacuum → filter_plate_frame; kiln_continuous_indirect → kiln_batch.
- 20 t: No equipment substitution.
- 200 t: No equipment substitution.

### metal_earth_abundant_on_metal_oxide

Original steps: incipient_wetness, dryer_rotary_40_100C, kiln_continuous_indirect, scrubber_nox, crystallizer, filter_rotary_vacuum, dryer_rotary_40_100C, kiln_continuous_indirect, kiln_continuous_indirect.

- 2 t: kiln_continuous_indirect → kiln_batch; filter_rotary_vacuum → filter_plate_frame; kiln_continuous_indirect → kiln_batch; kiln_continuous_indirect → kiln_batch.
- 20 t: No equipment substitution.
- 200 t: No equipment substitution.

### metal_pgm_carbon

Original steps: mixer_slurry, incipient_wetness, filter_plate_frame, dryer_batch_vacuum_tray.

- 2 t: No equipment substitution.
- 20 t: filter_plate_frame → filter_rotary_vacuum; dryer_batch_vacuum_tray → dryer_rotary_40_100C.
- 200 t: filter_plate_frame → filter_rotary_vacuum; dryer_batch_vacuum_tray → dryer_rotary_40_100C.

### metal_pgm_on_carbon

Original steps: incipient_wetness, reactor_multistep, scrubber_nox, filter_rotary_vacuum, reactor_simple, dryer_rotary_40_100C.

- 2 t: filter_rotary_vacuum → filter_plate_frame.
- 20 t: No equipment substitution.
- 200 t: No equipment substitution.

### metal_pgm_on_metal_oxide

Original steps: incipient_wetness, kiln_continuous_indirect, scrubber_nox, crystallizer, filter_rotary_vacuum, dryer_rotary_40_100C, dryer_rotary_100_300C, dryer_rotary_100_300C.

- 2 t: kiln_continuous_indirect → kiln_batch; filter_rotary_vacuum → filter_plate_frame.
- 20 t: No equipment substitution.
- 200 t: No equipment substitution.

### reduction_activation_addon

Original steps: kiln_continuous_indirect, flare.

- 2 t: kiln_continuous_indirect → kiln_batch.
- 20 t: No equipment substitution.
- 200 t: No equipment substitution.

### shaping_extrusion_pelletizing

Original steps: mixer_slurry, extruder_with_feeder, dryer_rotary_100_300C, kiln_continuous_indirect.

- 2 t: kiln_continuous_indirect → kiln_batch.
- 20 t: No equipment substitution.
- 200 t: No equipment substitution.

### sol_gel_metal_oxide

Original steps: mixer_slurry, reactor_multistep, dryer_rotary_40_100C, kiln_continuous_indirect, mill, scrubber_nox.

- 2 t: kiln_continuous_indirect → kiln_batch.
- 20 t: No equipment substitution.
- 200 t: No equipment substitution.

### solid_state_mechanochemical

Original steps: mixer_dry_blender, mill, kiln_continuous_indirect, mill.

- 2 t: kiln_continuous_indirect → kiln_batch.
- 20 t: No equipment substitution.
- 200 t: No equipment substitution.

### sulfidation_hydrotreating

Original steps: mixer_slurry, incipient_wetness, dryer_rotary_100_300C, kiln_continuous_indirect, extruder_with_feeder, reactor_simple, mill.

- 2 t: kiln_continuous_indirect → kiln_batch.
- 20 t: No equipment substitution.
- 200 t: No equipment substitution.

### washcoat_monolith

Original steps: mixer_slurry, mill, dryer_rotary_100_300C, kiln_continuous_indirect.

- 2 t: kiln_continuous_indirect → kiln_batch.
- 20 t: No equipment substitution.
- 200 t: No equipment substitution.

### wet_impregnation_metal_oxide

Original steps: mixer_slurry, incipient_wetness, dryer_rotary_100_300C, kiln_continuous_indirect, mill, scrubber_nox.

- 2 t: kiln_continuous_indirect → kiln_batch.
- 20 t: No equipment substitution.
- 200 t: No equipment substitution.

### zeolite_beta_bulk

Original steps: reactor_simple, crystallizer, crystallizer, reactor_simple, filter_rotary_vacuum, dryer_rotary_100_300C, kiln_continuous_indirect, reactor_multistep, filter_rotary_vacuum, kiln_continuous_indirect, scrubber_nox, mill, mixer_slurry, extruder_with_feeder.

- 2 t: filter_rotary_vacuum → filter_plate_frame; kiln_continuous_indirect → kiln_batch; filter_rotary_vacuum → filter_plate_frame; kiln_continuous_indirect → kiln_batch.
- 20 t: No equipment substitution.
- 200 t: No equipment substitution.

### zeolite_beta_with_metal_active_site

Original steps: reactor_simple, crystallizer, crystallizer, reactor_simple, filter_rotary_vacuum, dryer_rotary_100_300C, kiln_continuous_indirect, reactor_multistep, filter_rotary_vacuum, kiln_continuous_indirect, scrubber_nox, mill, mixer_slurry, extruder_with_feeder, incipient_wetness, dryer_rotary_100_300C, kiln_continuous_indirect.

- 2 t: filter_rotary_vacuum → filter_plate_frame; kiln_continuous_indirect → kiln_batch; filter_rotary_vacuum → filter_plate_frame; kiln_continuous_indirect → kiln_batch; kiln_continuous_indirect → kiln_batch.
- 20 t: No equipment substitution.
- 200 t: No equipment substitution.

### zeolite_fcc

Original steps: mixer_slurry, reactor_simple, filter_rotary_vacuum, dryer_spray, kiln_continuous_direct, mill, scrubber_nox.

- 2 t: filter_rotary_vacuum → filter_plate_frame; dryer_spray → dryer_rotary_100_300C; kiln_continuous_direct → kiln_batch.
- 20 t: No equipment substitution.
- 200 t: No equipment substitution.

### zeolite_zsm_5_2025_pct

Original steps: reactor_simple, crystallizer, filter_rotary_vacuum, reactor_multistep, reactor_multistep, filter_rotary_vacuum, filter_rotary_vacuum, dryer_rotary_100_300C, dryer_rotary_100_300C, kiln_continuous_indirect, scrubber_nox, mill, mixer_slurry, mixer_slurry, dryer_rotary_100_300C, dryer_rotary_100_300C.

- 2 t: filter_rotary_vacuum → filter_plate_frame; filter_rotary_vacuum → filter_plate_frame; filter_rotary_vacuum → filter_plate_frame; kiln_continuous_indirect → kiln_batch.
- 20 t: No equipment substitution.
- 200 t: No equipment substitution.

### zeolite_zsm_5_bulk

Original steps: reactor_simple, crystallizer, crystallizer, crystallizer, filter_rotary_vacuum, filter_rotary_vacuum, reactor_multistep, reactor_multistep, filter_rotary_vacuum, filter_rotary_vacuum, dryer_rotary_100_300C, dryer_rotary_100_300C, kiln_continuous_indirect, scrubber_nox, mill.

- 2 t: filter_rotary_vacuum → filter_plate_frame; filter_rotary_vacuum → filter_plate_frame; filter_rotary_vacuum → filter_plate_frame; filter_rotary_vacuum → filter_plate_frame; kiln_continuous_indirect → kiln_batch.
- 20 t: No equipment substitution.
- 200 t: No equipment substitution.
