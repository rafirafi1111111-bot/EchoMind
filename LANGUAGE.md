# Neuro-Flux (NF-X) — Language Spec v0.9

Wave-based. Bio-semantic. No sequential mutation as a first-class idea: state *resonates*.

## File form

```
::WAVEFORM <Qualified.Name>
@phase { name | name | name }
@consent { required | inherited | none }

  ... declarations ...

::END WAVEFORM
```

## Operators

| Glyph | Name | Meaning |
|-------|------|--------|
| `~>` | transmute | map one waveform into another |
| `~` | bound | value oscillates inside a range |
| `:=` | attune | bind a harmonic identity |
| `::` | phase-lock | couple two nodes |
| `=>` | emit | radiate a packet onto the mesh |
| `<=` | sense | ingest from soma or mesh |
| `\|\|` | interfere | constructive / destructive mix |
| `##` | dampen | reduce amplitude (ethics / decay) |
| `?~` | probe | non-destructive read |
| `!!` | crest | require a peak condition |
| `@` | annotate | metadata on a wave |

## Types

- `Affect` — valence, arousal, dominance, purity
- `Band` — named frequency interval (Hz)
- `Packet` — sealed Affect + Band + consent crest
- `Node` — mesh participant
- `Lattice` — set of phase-locked Nodes
- `Tick` — 11 ms quantum (alpha-adjacent)

## Ethics primitives

`consent.crest`, `consent.revoke`, `fail.closed`, `no.coerce`

A waveform marked `@consent { required }` cannot `=>` without a live crest.
