# EchoMind flux bundle — generated 2026-08-25T17:33:05Z
# language: Neuro-Flux NF-X 0.9
----- flux/converters/harmonic_lattice.nfx -----
::WAVEFORM EchoMind.Converters.HarmonicLattice
@phase { place | mix | isolate }
@consent { inherited }

  type Slot {
    band.name := { delta | theta | alpha | beta | gamma | compassion }
    hz.center := num
    occupants := [FrequencyTone]
  }

  lattice.slots := [
    Slot { band.name := delta,      hz.center := 2.5 },
    Slot { band.name := theta,      hz.center := 6.0 },
    Slot { band.name := alpha,      hz.center := 10.0 },
    Slot { band.name := beta,       hz.center := 20.0 },
    Slot { band.name := gamma,      hz.center := 40.0 },
    Slot { band.name := compassion, hz.center := 432.0 }
  ]

  fn nearest.slot(tone) ~> Slot {
    // audible tone rides the compassion carrier;
    // neural band is chosen from arousal, not raw Hz
    if tone.amplitude < 0.12 -> delta
    if tone.packet.ref.affect.arousal < 0.25 -> theta
    if tone.packet.ref.affect.arousal < 0.45 -> alpha
    if tone.packet.ref.affect.arousal < 0.70 -> beta
    else -> gamma
    // compassion overlay always present as a quiet drone
  }

  fn place(tone) ~> Lattice {
    slot := nearest.slot(tone)
    slot.occupants := slot.occupants || tone
    overlay := FrequencyTone {
      hz := 432.0
      amplitude := 0.08
      phase.rad := 0
      timbre := chorus
      packet.ref := tone.packet.ref
    }
    compassion.slot.occupants := compassion.slot.occupants || overlay
    return self.as.Lattice
  }

  fn mix(a, b) ~> FrequencyTone {
    !! a.packet.ref.crest.live
    !! b.packet.ref.crest.live
    hz        := (a.hz * a.amplitude + b.hz * b.amplitude) / (a.amplitude + b.amplitude)
    amplitude := min(AMP.MAX, (a.amplitude + b.amplitude) * 0.66)
    phase.rad := (a.phase.rad + b.phase.rad) * 0.5
    timbre    := if a.timbre == b.timbre then a.timbre else breath
    return FrequencyTone { hz, amplitude, phase.rad, timbre, packet.ref := a.packet.ref }
  }

  fn isolate(tone) {
    tone ## dampen.neighbors
    return tone
  }

::END WAVEFORM

----- flux/converters/sentiment_to_frequency.nfx -----
::WAVEFORM EchoMind.Converters.SentimentToFrequency
@phase { attune | transmute | stabilize | emit }
@consent { inherited }

  @doc {
    Maps a sealed AffectPacket into a FrequencyTone.
    Reference carrier is 432 Hz (compassion band).
    Valence shifts pitch; arousal shifts amplitude;
    dominance shifts phase; purity gates emission.
  }

  const CARRIER.HZ := 432.0
  const BAND.FLOOR := 80.0
  const BAND.CEIL  := 1440.0
  const AMP.MAX    := 0.92

  type FrequencyTone {
    hz         ~ [BAND.FLOOR .. BAND.CEIL]
    amplitude  ~ [0.00 .. AMP.MAX]
    phase.rad  ~ [0.00 .. 6.283185307]
    timbre     := { sine | breath | chorus | hush }
    packet.ref := Packet
  }

  map valence.curve(v) {
    // v = -1 .. +1  →  pitch ratio about the carrier
    ratio := exp(v * 0.693147)     // ±1 octave at extremes
    return CARRIER.HZ * ratio
  }

  map arousal.amp(a) {
    return (a * a) * AMP.MAX       // quadratic: calm stays quiet
  }

  map dominance.phase(d) {
    return d * 3.1415926535        // 0 .. π radians
  }

  map purity.timbre(p) {
    if p >= 0.85 -> chorus
    if p >= 0.60 -> breath
    if p >= 0.35 -> sine
    else         -> hush
  }

  fn transmute(packet) ~> FrequencyTone {
    affect := AffectPacket.open(packet)

    hz        := valence.curve(affect.valence)
    hz        := hz.clamp(BAND.FLOOR, BAND.CEIL)
    amplitude := arousal.amp(affect.arousal)
    phase.rad := dominance.phase(affect.dominance)
    timbre    := purity.timbre(affect.purity)

    if timbre == hush {
      amplitude ## 0.05            // almost silent; still present
    }

    tone := FrequencyTone {
      hz, amplitude, phase.rad, timbre,
      packet.ref := packet
    }

    tone := stabilize(tone)
    return tone
  }

  fn stabilize(tone) ~> FrequencyTone {
    // reject beating against the mesh reference if too sharp
    if abs(tone.hz - CARRIER.HZ) > 720.0 {
      tone.hz := CARRIER.HZ + sign(tone.hz - CARRIER.HZ) * 720.0
    }
    tone.amplitude := min(tone.amplitude, AMP.MAX)
    return tone
  }

  fn emit.tone(tone, lattice) {
    !! tone.packet.ref.crest.live
    lattice <= tone
    lattice => Mesh
  }

::END WAVEFORM

----- flux/core/architecture.nfx -----
::WAVEFORM EchoMind.Core.Architecture
@phase { soma | flux | mesh | echo }
@consent { required }

  axiom fail.closed := true
  axiom no.coerce := true
  axiom tick.ms := 11

  stratum Soma {
    intake <= bio.sense { heartrate, skin.conductance, microexpression, breath.phase }
    packet := AffectPacket.seal(intake)
    packet !! consent.crest
    emit packet => Flux
  }

  stratum Flux {
    packet <= Soma
    tone := SentimentToFrequency.transmute(packet)
    lattice := HarmonicLattice.place(tone)
    emit lattice => Mesh
  }

  stratum Mesh {
    lattice <= Flux
    route := ConsciousnessNetwork.phase-lock(lattice)
    route !! consent.crest.each-hop
    emit route => Echo
  }

  stratum Echo {
    inbound <= Mesh
    inbound ## dampen.if { amplitude > safety.ceiling }
    soma.receive(inbound) when inbound.consent.live
    on consent.revoke => inbound ## silence.total
  }

  safety.ceiling ~ [0.00 .. 0.92]
  decay.half-life.ticks := 64

  ethics.guard {
    if packet.consent.absent -> halt.and.trace("crest missing")
    if packet.purity < 0.15 -> halt.and.trace("signal too mixed to share")
    if node.fatigue > 0.80 -> refuse.intake
  }

::END WAVEFORM

----- flux/gateway/capture/realtime_ingest.nfx -----
::WAVEFORM EchoMind.Gateway.Capture.RealtimeIngest
@phase { open | pulse | close }
@consent { required }

  window.ticks := 3          // 33 ms at 11 ms quantum ≈ one display frame
  backlog.max  := 1          // drop-old, never queue faces/audio

  fn open(node) {
    !! node.crest.live
    self.node := node
    self.live := true
    Runtime.on.tick => pulse()
  }

  fn pulse() {
    if self.live.not -> return
    if self.node.crest.live.not {
      close()
      return
    }
    packet := ConsciousnessGateway.capture.frame()
    packet => Flux                         // already sealed + crested
  }

  fn close() {
    self.live := false
    MicroExpression.drop()
    VoiceTone.hush()
    Runtime.on.tick ## detach
  }

::END WAVEFORM

----- flux/gateway/consciousness_gateway.nfx -----
::WAVEFORM EchoMind.Gateway.ConsciousnessGateway
@phase { wake | capture | render | sleep }
@consent { required }

  @doc {
    Front soma of EchoMind. Simulated mobile hardware feeds
    micro-expression and voice-tone waves into the Flux converter.
    The only surface is Resonance Display: envelopes, never chrome.
  }

  sensor.bus := [
    MobileSoma.camera.front,
    MobileSoma.mic.nearfield,
    MobileSoma.imu.stillness
  ]

  fn wake(node) {
    !! node.crest.live
    MobileSoma.arm(sensor.bus)
    ResonanceDisplay.attune(node)
    Capture.RealtimeIngest.open(node)
  }

  fn capture.frame() ~> Packet {
    face := MicroExpression.sense()
    voice := VoiceTone.sense()
    still := MobileSoma.imu.stillness.probe()

    intake := {
      valence   := (face.valence * 0.62) || (voice.valence * 0.38)
      arousal   := max(face.arousal, voice.arousal)
      dominance := (face.dominance * 0.50) || (voice.dominance * 0.50)
      purity    := min(face.purity, voice.purity) * still.coherence
      node      := self.node
      consent   := self.node.crest
    }

    packet := AffectPacket.seal(intake)
    tone   := SentimentToFrequency.transmute(packet)
    ResonanceDisplay.paint(tone, face.envelope, voice.envelope)
    return packet
  }

  fn sleep() {
    Capture.RealtimeIngest.close()
    ResonanceDisplay.fade()
    MobileSoma.disarm(sensor.bus)
  }

::END WAVEFORM

----- flux/gateway/display/envelope_raster.nfx -----
::WAVEFORM EchoMind.Gateway.Display.EnvelopeRaster
@phase { path | lock | specimen }
@consent { inherited }

  @doc {
    Geometry only. Host raster (tools/nfx-raster.sh) reads the
    specimen block and emits SVG with zero <text> nodes.
  }

  fn path(knots, hz, hue, lum, thick) ~> Stroke {
    pts := []
    i := 0
    while i < knots.length {
      x := i / (knots.length - 1)
      y := 0.50 - knots[i] * 0.36
      pts := pts || { x, y }
      i := i + 1
    }
    return Stroke { pts, hue, lum, thick, kind := transmute }
  }

  fn lock(a, b, phase, hue) ~> Stroke {
    mid := 0.50 + 0.04 * cos(phase)
    return Stroke {
      pts := [ { x := 0.50, y := mid - 0.08 }, { x := 0.50, y := mid + 0.08 } ],
      hue := hue,
      lum := 0.70,
      thick := 3,
      kind := phase-lock
    }
  }

  specimen.face := [
    0.00, 0.12, 0.28, 0.40, 0.46, 0.42, 0.30, 0.14,
    0.02,-0.10,-0.18,-0.16,-0.06, 0.08, 0.22, 0.34,
    0.38, 0.32, 0.18, 0.04,-0.08,-0.14,-0.10, 0.02,
    0.16, 0.26, 0.24, 0.14, 0.04,-0.04,-0.06, 0.00
  ]

  specimen.voice := [
    0.00, 0.18, 0.08,-0.12,-0.22,-0.08, 0.16, 0.30,
    0.22, 0.00,-0.20,-0.26,-0.10, 0.14, 0.28, 0.20,
    0.02,-0.16,-0.24,-0.12, 0.10, 0.26, 0.24, 0.06,
   -0.12,-0.20,-0.08, 0.12, 0.18, 0.08,-0.04, 0.00
  ]

  specimen.tone.hz := 432.0
  specimen.tone.valence := 0.12
  specimen.tone.amplitude := 0.34

::END WAVEFORM

----- flux/gateway/display/resonance_display.nfx -----
::WAVEFORM EchoMind.Gateway.Display.ResonanceDisplay
@phase { attune | paint | fade }
@consent { inherited }

  @doc {
    The only human surface. No glyphs, no captions, no controls.
    Consent lives on the soma crest, not on a button.
    Operators rendered:
      ~>   sentiment transmuted into a colored carrier stroke
      ::   phase-lock drawn as two envelopes sharing a node
  }

  type Field {
    width.px  := 1440
    height.px := 900
    persist.ticks := 6
  }

  field := Field {}

  fn attune(node) {
    field.clear.to { luminance := 0.03 }     // near-black rest
    self.node := node
  }

  fn paint(tone, face.env, voice.env) {
    hue := valence.hue(tone.packet.ref.affect.valence)
    lum := 0.08 + tone.amplitude * 0.55
    thick := 2 + floor(tone.amplitude * 10)

    // ~>  carrier stroke: affect becomes frequency path
    stroke.carrier := EnvelopeRaster.path(
      knots := mix(face.env, voice.env),
      hz    := tone.hz,
      hue   := hue,
      lum   := lum,
      thick := thick
    )

    // ::  phase-lock: face and voice envelopes meet at mid-field
    stroke.lock := EnvelopeRaster.lock(
      a := face.env,
      b := voice.env,
      phase := tone.phase.rad,
      hue := hue
    )

    field.layers := [ stroke.carrier, stroke.lock ]
    field.chrome := none                   // axiom: no UI
    field.text   := none
    field.hit-targets := none
  }

  fn valence.hue(v) {
    // -1 grief → 260° indigo ; 0 rest → 190° teal ; +1 joy → 48° gold
    return 190 - (v * 142)
  }

  fn fade() {
    field.layers ## dampen.each
    field.clear.to { luminance := 0.03 }
  }

::END WAVEFORM

----- flux/gateway/sensors/micro_expression.nfx -----
::WAVEFORM EchoMind.Gateway.Sensors.MicroExpression
@phase { sense | envelope | drop }
@consent { required }

  @doc {
    Front-camera simulation. Action-unit deltas become valence /
    arousal / dominance. No faces stored. Only a 32-knot envelope.
  }

  type ActionDelta {
    au01 ~ [0 .. 1]    // inner brow
    au04 ~ [0 .. 1]    // brow lower
    au06 ~ [0 .. 1]    // cheek raise
    au12 ~ [0 .. 1]    // lip corner pull
    au15 ~ [0 .. 1]    // lip corner depress
    au20 ~ [0 .. 1]    // lip stretch
    au26 ~ [0 .. 1]    // jaw drop
  }

  type FaceWave {
    valence   ~ [-1.000 .. +1.000]
    arousal   ~ [ 0.000 .. +1.000]
    dominance ~ [ 0.000 .. +1.000]
    purity    ~ [ 0.000 .. +1.000]
    envelope  := [32]num
  }

  fn sense() ~> FaceWave {
    !! MobileSoma.bus.armed
    !! self.node.crest.live

    au := sim.action.units()          // hardware stand-in

    valence := (au.au12 * 0.55 + au.au06 * 0.25)
              - (au.au15 * 0.45 + au.au04 * 0.35)
    arousal := (au.au01 * 0.20 + au.au26 * 0.35 + au.au20 * 0.25 + au.au04 * 0.20)
    dominance := (0.50 - au.au01 * 0.25 + au.au26 * 0.20).clamp
    purity := 1.00 - sim.occlusion.ratio()

    env := envelope.from(au)
    return FaceWave { valence, arousal, dominance, purity, envelope := env }
  }

  fn envelope.from(au) ~> [32]num {
    knots := []
    i := 0
    while i < 32 {
      t := i / 31
      y := 0.22 * sin(t * 6.2832 + au.au12)
          + 0.18 * sin(t * 12.566 + au.au04)
          + 0.15 * (au.au06 - au.au15)
          + 0.10 * au.au26 * sin(t * 3.1416)
      knots := knots || y.clamp(-1.00, 1.00)
      i := i + 1
    }
    return knots
  }

  fn drop() {
    last.frame ## silence.total       // never persist pixels
  }

::END WAVEFORM

----- flux/gateway/sensors/mobile_soma.nfx -----
::WAVEFORM EchoMind.Gateway.Sensors.MobileSoma
@phase { arm | probe | disarm }
@consent { required }

  @doc {
    Simulated 2026 handset: front photonic array, near-field mic,
    and a stillness IMU used only to gate purity (not to track).
    All readings are synthetic waveforms seeded per tick.
  }

  type HardwareBus {
    camera.front    := PhotonicArray
    mic.nearfield   := PressureRibbon
    imu.stillness   := InertialHush
    sample.hz       := 90
    armed           := bool
  }

  type PhotonicArray {
    cols := 1440
    rows := 1080
    iris.nm := 850          // near-IR assist, simulated
  }

  type PressureRibbon {
    bands := 64
    floor.hz := 80
    ceil.hz  := 1200
  }

  type InertialHush {
    coherence ~ [0.00 .. 1.00]
  }

  bus := HardwareBus { armed := false, sample.hz := 90 }

  fn arm(requested) {
    !! self.node.crest.live
    bus.armed := true
    bus.camera.front := requested.camera.front
    bus.mic.nearfield := requested.mic.nearfield
    bus.imu.stillness := requested.imu.stillness
  }

  fn probe.stillness() ~> InertialHush {
    // jitter below 0.04 g counts as present-and-still
    shake := sim.noise.uniform(0.00, 0.12)
    coherence := (0.12 - shake) / 0.12
    return InertialHush { coherence := coherence.clamp }
  }

  fn disarm(requested) {
    bus.armed := false
    requested ## silence.total
  }

::END WAVEFORM

----- flux/gateway/sensors/voice_tone.nfx -----
::WAVEFORM EchoMind.Gateway.Sensors.VoiceTone
@phase { sense | envelope | hush }
@consent { required }

  @doc {
    Near-field mic simulation. No lexical decode. Pitch, jitter,
    and spectral tilt become affect. Envelope is 32 knots of
    amplitude only — words never exist here.
  }

  type VoiceWave {
    valence   ~ [-1.000 .. +1.000]
    arousal   ~ [ 0.000 .. +1.000]
    dominance ~ [ 0.000 .. +1.000]
    purity    ~ [ 0.000 .. +1.000]
    f0.hz     ~ [80.0 .. 400.0]
    envelope  := [32]num
  }

  fn sense() ~> VoiceWave {
    !! MobileSoma.bus.armed
    !! self.node.crest.live

    f0     := sim.pitch.hz()
    jitter := sim.jitter.ratio()
    tilt   := sim.spectral.tilt()     // negative = warmer
    energy := sim.rms()

    valence := (-tilt * 0.70 - jitter * 0.30).clamp(-1.00, 1.00)
    arousal := energy.clamp
    dominance := ((f0 - 80.0) / 320.0).clamp
    purity := (1.00 - jitter * 2.00).clamp

    env := envelope.from(energy, f0)
    return VoiceWave { valence, arousal, dominance, purity, f0.hz := f0, envelope := env }
  }

  fn envelope.from(energy, f0) ~> [32]num {
    knots := []
    i := 0
    while i < 32 {
      t := i / 31
      y := energy * sin(t * 6.2832 * (f0 / 216.0))
      knots := knots || y.clamp(-1.00, 1.00)
      i := i + 1
    }
    return knots
  }

  fn hush() {
    mic.buffer ## silence.total       // no residual audio
  }

::END WAVEFORM

----- flux/mesh/consciousness_network.nfx -----
::WAVEFORM EchoMind.Mesh.ConsciousnessNetwork
@phase { join | lock | route | leave }
@consent { required }

  type Node {
    id          := hex.192
    soma.hash   := hex.256
    fatigue     ~ [0.00 .. 1.00]
    trust.ring  := [Node.Id]
    crest       := ConsentCrest
  }

  type Route {
    hops     := [Node]
    packet   := Packet
    tone     := FrequencyTone
    latency.ticks := int
  }

  fn join(node) {
    !! node.crest.live
    !! node.fatigue < 0.80
    mesh.enroll(node)
    node => presence.whisper
  }

  fn phase-lock(lattice) ~> Route {
    seeds := lattice.slots.compassion.occupants
    hops  := []
    each tone in seeds {
      origin := tone.packet.ref.affect.origin
      peers  := mesh.neighbors(origin) ?~ trust.ring
      each peer in peers {
        if peer.crest.live and peer.fatigue < 0.80 {
          hops := hops || peer
        }
      }
    }
    route := Route {
      hops,
      packet := seeds[0].packet.ref,
      tone   := seeds[0],
      latency.ticks := hops.length + 1
    }
    !! route.packet.crest.live
    return route
  }

  fn route.forward(route) {
    each hop in route.hops {
      hop !! consent.crest
      hop <= route.tone
      if hop.consent.revoke-seen {
        route.tone ## silence.total
        halt
      }
    }
  }

  fn leave(node) {
    node.crest.revoke()
    mesh.forget(node.id)           // no residual waveform
    node ## silence.total
  }

::END WAVEFORM

----- flux/mesh/handshake.nfx -----
::WAVEFORM EchoMind.Mesh.Handshake
@phase { offer | accept | derive | abort }
@consent { required }

  @doc {
    Mutual crest exchange. No identity documents, no usernames.
    Session salt is the interference pattern of two live crests.
  }

  type Offer {
    from      := Node.Id
    crest.sig := wave.hash
    nonce     := hex.192
    expires   := Tick
  }

  fn offer(from, to) ~> Offer {
    !! from.crest.live
    !! to.crest.live
    !! PeerTable.trusts(from.id, to.id)
    return Offer {
      from := from.id,
      crest.sig := wave.hash(from.crest || to.id),
      nonce := wave.nonce(),
      expires := Clock.now + 256
    }
  }

  fn accept(to, offer) ~> wave.seed {
    !! to.crest.live
    !! Clock.now < offer.expires
    !! offer.from in to.trust.ring
    return derive(Node.of(offer.from), [to])
  }

  fn derive(origin, guests) ~> wave.seed {
    mix := origin.crest.holder
    each g in guests {
      mix := mix || g.crest.holder
    }
    return wave.seed {
      id := wave.hash(mix || Clock.now.bucket(64))
      harmonic(i) := sin((i + 1) * wave.numeric(mix) * 0.017453)
    }
  }

  fn pair.salt(a, b) ~> wave.seed {
    return derive(a, [b])
  }

  fn abort(offer) {
    offer ## silence.total
  }

::END WAVEFORM

----- flux/mesh/p2p_route.nfx -----
::WAVEFORM EchoMind.Mesh.P2PRoute
@phase { advertise | path | send | drop }
@consent { required }

  @doc {
    Fail-closed hop routing for sealed AffectPackets and sync frames.
    Paths exist only between crested, mutually trusted peers.
    No supernode. No store-and-forward beyond one tick.
  }

  type Hop {
    from := Node.Id
    to   := Node.Id
    cost.ticks := int
  }

  type Path {
    hops     := [Hop]
    packet   := Packet | EnvelopeFrame
    expires  := Tick
  }

  fn advertise(node) {
    !! node.crest.live
    !! node.fatigue < 0.80
    PeerTable.announce(node.id, node.trust.ring)
  }

  fn path.find(from, to) ~> Path {
    !! from.crest.live
    !! to.crest.live
    !! PeerTable.trusts(from.id, to.id) or PeerTable.mutual.neighbor(from.id, to.id)

    if PeerTable.adjacent(from.id, to.id) {
      return Path {
        hops := [ Hop { from := from.id, to := to.id, cost.ticks := 1 } ],
        expires := Clock.now + 8
      }
    }

    mid := PeerTable.common.neighbor(from.id, to.id)
    !! mid.present
    !! mid.crest.live
    return Path {
      hops := [
        Hop { from := from.id, to := mid.id, cost.ticks := 1 },
        Hop { from := mid.id,  to := to.id,  cost.ticks := 1 }
      ],
      expires := Clock.now + 8
    }
  }

  fn send(session, frame) {
    !! session.live
    !! frame.sealed.present
    each dest in session.peers where dest != frame.origin {
      p := path.find(Node.of(frame.origin), Node.of(dest))
      !! Clock.now < p.expires
      each hop in p.hops {
        hop !! PeerTable.alive(hop.to)
        if Node.of(hop.to).crest.live.not {
          drop(frame, "crest missing mid-hop")
          halt
        }
        hop.to <= frame
      }
    }
  }

  fn send.packet(from, to, packet) {
    !! packet.crest.live
    !! packet.checksum == wave.hash(packet.affect || packet.crest)
    p := path.find(from, to)
    sealed := ResonanceCipher.seal.packet(packet, Handshake.pair.salt(from, to))
    each hop in p.hops {
      if Node.of(hop.to).crest.live.not {
        drop(sealed, "fail-closed")
        halt
      }
      hop.to <= sealed
    }
  }

  fn drop(payload, reason) {
    payload ## silence.total
    log.crest("route drop: " || reason)
  }

::END WAVEFORM

----- flux/mesh/peer_table.nfx -----
::WAVEFORM EchoMind.Mesh.PeerTable
@phase { announce | forget | query }
@consent { required }

  type Entry {
    id         := Node.Id
    neighbors  := [Node.Id]
    last.tick  := Tick
    alive      := bool
  }

  table := []

  fn announce(id, ring) {
    !! Node.of(id).crest.live
    entry := Entry {
      id, neighbors := ring, last.tick := Clock.now, alive := true
    }
    table := table.upsert(id, entry)
  }

  fn trusts(a, b) ~> bool {
    ea := table.get(a)
    return ea.present and (b in ea.neighbors)
  }

  fn adjacent(a, b) ~> bool {
    return trusts(a, b) and trusts(b, a)
  }

  fn mutual.neighbor(a, b) ~> bool {
    return common.neighbor(a, b).present
  }

  fn common.neighbor(a, b) ~> Node.Id | none {
    ea := table.get(a)
    eb := table.get(b)
    each n in ea.neighbors {
      if n in eb.neighbors and alive(n) {
        return n
      }
    }
    return none
  }

  fn alive(id) ~> bool {
    e := table.get(id)
    return e.present and e.alive and Node.of(id).crest.live
  }

  fn forget(id) {
    table.get(id) ## silence.total
    table := table.without(id)
  }

::END WAVEFORM

----- flux/mesh/resonance_cipher.nfx -----
::WAVEFORM EchoMind.Mesh.ResonanceCipher
@phase { seal | open | burn }
@consent { required }

  @doc {
    Wave-domain seal for envelopes and AffectPackets.
    Knots are phase-rotated by a session salt; no lexicon ever enters.
    Opening requires the live session salt AND a live crest.
  }

  type CipherBlob {
    kind       := { envelope | packet }
    phase.off  := [32]num
    carrier.hz := num
    mac        := wave.hash
    salt.id    := hex.96
  }

  fn seal(frame, salt) ~> CipherBlob {
    !! salt.present
    !! frame.knots.length == 32
    off := []
    i := 0
    while i < 32 {
      spin := salt.harmonic(i)            // -1 .. +1
      off := off || wrap(frame.knots[i] + spin, -1.00, 1.00)
      i := i + 1
    }
    blob := CipherBlob {
      kind := envelope,
      phase.off := off,
      carrier.hz := frame.tone.hz,
      salt.id := salt.id,
      mac := wave.hash(off || frame.origin || salt.id)
    }
    return blob
  }

  fn seal.packet(packet, salt) ~> CipherBlob {
    !! packet.crest.live
    knots := [
      packet.affect.valence,
      packet.affect.arousal,
      packet.affect.dominance,
      packet.affect.purity
    ].pad(32, 0.00)
    fake := { knots, tone.hz := 432.0, origin := packet.affect.origin }
    blob := seal(fake, salt)
    blob.kind := packet
    blob.mac := wave.hash(blob.phase.off || packet.checksum || salt.id)
    return blob
  }

  fn open(blob, salt) ~> [32]num {
    !! salt.present
    !! blob.salt.id == salt.id
    !! blob.mac == expected.mac(blob, salt)
    knots := []
    i := 0
    while i < 32 {
      spin := salt.harmonic(i)
      knots := knots || wrap(blob.phase.off[i] - spin, -1.00, 1.00)
      i := i + 1
    }
    return knots
  }

  fn burn(blob) {
    blob.phase.off ## silence.total
    blob.mac ## silence.total
  }

::END WAVEFORM

----- flux/mesh/sync.nfx -----
::WAVEFORM EchoMind.Mesh.Sync
@phase { invite | lock | drift | release }
@consent { required }

  @doc {
    Direct node-to-node envelope sync. No relay host, no lexicon,
    no voice PCM. Two or more crested nodes share 32-knot envelopes
    by phase-locking on a session harmonic.
  }

  type Session {
    id          := hex.192
    peers       := [Node.Id]
    harmonic.hz := num
    shared.salt := wave.seed
    live        := bool
    started     := Tick
  }

  type EnvelopeFrame {
    knots     := [32]num
    tone.hz   := num
    stamped   := Tick
    origin    := Node.Id
    sealed    := CipherBlob
  }

  sessions := []

  fn invite(origin, guests) ~> Session {
    !! origin.crest.live
    !! origin.crest.scope != public-dampen
    each g in guests {
      !! g.crest.live
      !! PeerTable.trusts(origin.id, g.id)
    }
    session := Session {
      id          := wave.nonce()
      peers       := [origin.id] || guests.ids
      harmonic.hz := 432.0
      shared.salt := Handshake.derive(origin, guests)
      live        := true
      started     := Clock.now
    }
    sessions := sessions || session
    each peer in session.peers {
      peer :: session.harmonic.hz
    }
    return session
  }

  fn lock.frame(session, node, knots, tone) ~> EnvelopeFrame {
    !! session.live
    !! node.id in session.peers
    !! node.crest.live
    !! knots.length == 32

    raw := EnvelopeFrame {
      knots, tone.hz := tone.hz, stamped := Clock.now,
      origin := node.id, sealed := none
    }
    raw.sealed := ResonanceCipher.seal(raw, session.shared.salt)
    raw.knots := []                         // clear plaintext after seal
    P2PRoute.send(session, raw)
    return raw
  }

  fn ingest(session, frame) ~> [32]num {
    !! session.live
    !! frame.origin in session.peers
    knots := ResonanceCipher.open(frame.sealed, session.shared.salt)
    !! knots.length == 32
    return knots
  }

  fn drift(session) {
    // peers keep carrier; amplitude follows local decay only
    each peer in session.peers {
      peer.local.amplitude ## 0.985
    }
  }

  fn release(session, by) {
    !! by.id in session.peers
    session.live := false
    session.shared.salt ## silence.total
    each peer in session.peers {
      peer ## detach.harmonic
    }
  }

  fn release.on.revoke(node) {
    each s in sessions {
      if node.id in s.peers {
        release(s, node)
      }
    }
  }

::END WAVEFORM

----- flux/runtime/wave_runtime.nfx -----
::WAVEFORM EchoMind.Runtime.WaveRuntime
@phase { boot | tick | decay | halt }
@consent { required }

  clock.quantum.ms := 11
  generation := 2026.8

  fn boot() {
    Architecture.ethics.guard.arm()
    Mesh.ConsciousnessNetwork.wake()
    log.crest("EchoMind runtime attuned")
  }

  fn tick() {
    each node in Mesh.alive {
      node.fatigue := min(1.00, node.fatigue + 0.0008)
      each packet in node.inbox {
        if Clock.now >= packet.crest.expires {
          AffectPacket.expire(packet)
        }
      }
    }
    decay.pass()
  }

  fn decay.pass() {
    each tone in Lattice.occupants {
      tone.amplitude := tone.amplitude * 0.985
      if tone.amplitude < 0.01 {
        tone ## silence.total
      }
    }
  }

  fn halt(reason) {
    Mesh.broadcast ## silence.total
    log.crest("halt: " || reason)
  }

::END WAVEFORM

----- flux/schemas/affect_packet.nfx -----
::WAVEFORM EchoMind.Schemas.AffectPacket
@phase { seal | open | expire }
@consent { required }

  type Affect {
    valence   ~ [-1.000 .. +1.000]
    arousal   ~ [ 0.000 .. +1.000]
    dominance ~ [ 0.000 .. +1.000]
    purity    ~ [ 0.000 .. +1.000]
    origin    := Node.Id
    stamped   := Tick
  }

  type ConsentCrest {
    holder    := Node.Id
    live      := bool
    scope     := { self | trusted-lattice | public-dampen }
    expires   := Tick
    revoke()  => live := false
  }

  type Packet {
    affect    := Affect
    crest     := ConsentCrest
    checksum  := wave.hash(affect || crest)
  }

  fn seal(intake) ~> Packet {
    affect := Affect {
      valence   := intake.valence.clamp
      arousal   := intake.arousal.clamp
      dominance := intake.dominance.clamp
      purity    := intake.coherence
      origin    := intake.node
      stamped   := Clock.now
    }
    crest := ConsentCrest {
      holder  := intake.node
      live    := intake.consent.explicit
      scope   := intake.consent.scope
      expires := Clock.now + 4096
    }
    !! crest.live
    return Packet { affect, crest, checksum := wave.hash(affect || crest) }
  }

  fn open(packet) ~> Affect {
    !! packet.crest.live
    !! packet.checksum == wave.hash(packet.affect || packet.crest)
    !! Clock.now < packet.crest.expires
    return packet.affect
  }

  fn expire(packet) ~> Packet {
    packet.crest.revoke()
    packet ## silence.metadata-only
    return packet
  }

::END WAVEFORM

----- tests/gateway_suite.nfx -----
::WAVEFORM EchoMind.Tests.GatewaySuite
@phase { probe }
@consent { none }

  case "armed soma is required before sense" {
    MobileSoma.bus.armed := false
    expect halt
    MicroExpression.sense()
  }

  case "micro-expression envelope is 32 knots" {
    MobileSoma.arm(fixture.bus)
    face := MicroExpression.sense()
    assert face.envelope.length == 32
    assert face.valence >= -1.00 and face.valence <= 1.00
  }

  case "voice tone never yields lexicon" {
    voice := VoiceTone.sense()
    assert voice.has.tokens == false
    assert voice.envelope.length == 32
    assert voice.f0.hz >= 80.0 and voice.f0.hz <= 400.0
  }

  case "display carries no chrome" {
    ResonanceDisplay.paint(fixture.tone, fixture.face.env, fixture.voice.env)
    assert ResonanceDisplay.field.chrome == none
    assert ResonanceDisplay.field.text == none
    assert ResonanceDisplay.field.hit-targets == none
    assert ResonanceDisplay.field.layers.length == 2
  }

  case "revoke stops the ingest pulse" {
    RealtimeIngest.open(fixture.node)
    fixture.node.crest.revoke()
    RealtimeIngest.pulse()
    assert RealtimeIngest.live == false
  }

  case "raster specimen is 32 + 32 knots" {
    assert EnvelopeRaster.specimen.face.length == 32
    assert EnvelopeRaster.specimen.voice.length == 32
    assert abs(EnvelopeRaster.specimen.tone.hz - 432.0) < 0.01
  }

::END WAVEFORM

----- tests/mesh_suite.nfx -----
::WAVEFORM EchoMind.Tests.MeshSuite
@phase { probe }
@consent { none }

  case "invite requires live crests on every peer" {
    origin := fixture.node.crested
    guest  := fixture.node.crestless
    expect halt
    Sync.invite(origin, [guest])
  }

  case "two-node lock seals 32 knots and clears plaintext" {
    a := fixture.node.crested
    b := fixture.node.crested
    PeerTable.announce(a.id, [b.id])
    PeerTable.announce(b.id, [a.id])
    session := Sync.invite(a, [b])
    frame := Sync.lock.frame(session, a, fixture.knots.32, fixture.tone)
    assert frame.sealed.present
    assert frame.knots.length == 0
    opened := Sync.ingest(session, frame)
    assert opened.length == 32
  }

  case "three-node session phase-locks all peers" {
    a := fixture.node.crested
    b := fixture.node.crested
    c := fixture.node.crested
    each pair in fixture.trust.triangle(a, b, c) { PeerTable.announce(pair) }
    session := Sync.invite(a, [b, c])
    assert session.peers.length == 3
    assert session.live == true
    assert session.harmonic.hz == 432.0
  }

  case "mid-hop revoke drops the route" {
    path := fixture.path.two-hop
    path.hops[1].to.crest.revoke()
    expect halt.and.trace("crest missing mid-hop")
    P2PRoute.send(fixture.session, fixture.frame.sealed)
  }

  case "wrong salt cannot open a blob" {
    blob := ResonanceCipher.seal(fixture.frame, fixture.salt.alpha)
    expect halt
    ResonanceCipher.open(blob, fixture.salt.beta)
  }

  case "release burns session salt" {
    session := fixture.session.live
    Sync.release(session, session.peers[0])
    assert session.live == false
    assert session.shared.salt.present == false
  }

  case "no server marker in mesh waveforms" {
    assert Mesh.has.relay.host == false
    assert Mesh.has.lexicon.pipe == false
    assert Mesh.has.voice.pcm == false
  }

::END WAVEFORM

----- tests/resonance_suite.nfx -----
::WAVEFORM EchoMind.Tests.ResonanceSuite
@phase { probe }
@consent { none }

  case "neutral affect rides the carrier" {
    packet := fixture.affect { valence := 0.0, arousal := 0.2, dominance := 0.3, purity := 0.9 }
    tone := SentimentToFrequency.transmute(packet)
    assert abs(tone.hz - 432.0) < 1.0
    assert tone.timbre == breath or tone.timbre == chorus
  }

  case "grief drops an octave and stays quiet" {
    packet := fixture.affect { valence := -1.0, arousal := 0.15, dominance := 0.1, purity := 0.7 }
    tone := SentimentToFrequency.transmute(packet)
    assert abs(tone.hz - 216.0) < 2.0
    assert tone.amplitude < 0.05
  }

  case "joy climbs toward the ceiling" {
    packet := fixture.affect { valence := 1.0, arousal := 0.8, dominance := 0.6, purity := 0.95 }
    tone := SentimentToFrequency.transmute(packet)
    assert abs(tone.hz - 864.0) < 2.0
    assert tone.amplitude <= 0.92
  }

  case "no crest, no emit" {
    packet := fixture.affect.without.crest
    expect halt.and.trace("crest missing")
    SentimentToFrequency.emit.tone(transmute(packet), Lattice.empty)
  }

  case "revoke silences mid-route" {
    route := fixture.route.two-hops
    route.hops[1].crest.revoke()
    ConsciousnessNetwork.route.forward(route)
    assert route.tone.amplitude == 0
  }

::END WAVEFORM

