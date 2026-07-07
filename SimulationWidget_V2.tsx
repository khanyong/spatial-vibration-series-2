import React, { useState, useEffect, useRef } from 'react';

interface Star {
  r: number;
  theta: number;
  speed: number;
  size: number;
  color: string;
}

interface TimeLeapFlash {
  startPx: number;
  startPy: number;
  endPx: number;
  endPy: number;
  alpha: number;
}

interface Photon {
  x: number;
  y: number;
  vx: number;
  vy: number;
  active: boolean;
  isTimeLeaped?: boolean;
  trail: { px: number; py: number }[];
  color: string;
  initY: number;
}

export const SimulationWidget_V2: React.FC = () => {
  const [simMode, setSimMode] = useState<'rotation' | 'expansion' | 'lensing'>('rotation');

  // V2 Physics Parameters
  const [galaxyMass, setGalaxyMass] = useState<number>(40);
  const [chameleonCoupling, setChameleonCoupling] = useState<number>(1.5); // Flat curve height
  const [matterDensity, setMatterDensity] = useState<number>(2.0); // Local density ρ_m (Chameleon transition parameter)
  const [turbulentNoise, setTurbulentNoise] = useState<number>(0.5); // Lensing scattering

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const starsRef = useRef<Star[]>([]);
  const photonsRef = useRef<Photon[]>([]);
  const requestRef = useRef<number | null>(null);
  const frameCountRef = useRef<number>(0);
  const graphHistoryRef = useRef<{ x: number; y: number }[]>([]);
  const flashesRef = useRef<TimeLeapFlash[]>([]);

  // Drag-to-rotate state for Lensing mode
  const [angleX, setAngleX] = useState<number>(10 * Math.PI / 180);
  const [angleY, setAngleY] = useState<number>(45 * Math.PI / 180);
  const isDragging = useRef<boolean>(false);
  const prevMousePos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const resetSimulation = () => {
    starsRef.current = [];
    photonsRef.current = [];
    flashesRef.current = [];
    graphHistoryRef.current = [];
    frameCountRef.current = 0;

    // Initialize Stars for Rotation Curve Mode
    if (simMode === 'rotation') {
      for (let i = 0; i < 80; i++) {
        // Distribute stars radially
        const r = 40 + Math.random() * 140;
        const theta = Math.random() * 2 * Math.PI;
        // Newtonian vs Flat curve speed
        const vNewton = Math.sqrt((galaxyMass * 100) / r);
        const vFlat = chameleonCoupling * 4.5;
        // Combined velocity matching rotation curve
        const vCombined = Math.sqrt(vNewton * vNewton + vFlat * vFlat);
        starsRef.current.push({
          r,
          theta,
          speed: vCombined * 0.005,
          size: 1 + Math.random() * 2,
          color: `hsl(${200 + Math.random() * 40}, 85%, ${70 + Math.random() * 20}%)`
        });
      }
    }
  };

  useEffect(() => {
    resetSimulation();
  }, [simMode, galaxyMass, chameleonCoupling, matterDensity, turbulentNoise]);

  // Handle Drag-to-rotate in Lensing (3D view)
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (simMode !== 'lensing') return;
    isDragging.current = true;
    prevMousePos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging.current || simMode !== 'lensing') return;
    const dx = e.clientX - prevMousePos.current.x;
    const dy = e.clientY - prevMousePos.current.y;
    setAngleY((prev) => prev + dx * 0.007);
    setAngleX((prev) => Math.max(-Math.PI / 3, Math.min(Math.PI / 3, prev - dy * 0.007)));
    prevMousePos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUpOrLeave = () => {
    isDragging.current = false;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const render = () => {
      frameCountRef.current += 1;
      const width = canvas.width;
      const height = canvas.height;

      // Dark background
      ctx.fillStyle = '#09090b';
      ctx.fillRect(0, 0, width, height);

      if (simMode === 'rotation') {
        // ==========================================
        // Mode A: Galaxy Rotation Curve (Dark Matter)
        // ==========================================
        const cx = width * 0.65;
        const cy = height / 2;

        // Draw Tensor Condensation Halo (glowing golden cloud in the outer disk)
        ctx.save();
        const haloGrad = ctx.createRadialGradient(cx, cy, 70, cx, cy, 185);
        haloGrad.addColorStop(0, 'rgba(250, 204, 21, 0)');
        haloGrad.addColorStop(0.5, `rgba(250, 204, 21, ${chameleonCoupling * 0.055})`);
        haloGrad.addColorStop(1, 'rgba(250, 204, 21, 0)');
        ctx.fillStyle = haloGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, 185, 0, 2 * Math.PI);
        ctx.fill();
        ctx.restore();

        // Draw central core (Galaxy Bulge)
        const bulgeGrad = ctx.createRadialGradient(cx, cy, 2, cx, cy, 25);
        bulgeGrad.addColorStop(0, '#ffffff');
        bulgeGrad.addColorStop(0.2, '#fef08a');
        bulgeGrad.addColorStop(0.5, 'rgba(245, 158, 11, 0.4)');
        bulgeGrad.addColorStop(1, 'rgba(245, 158, 11, 0)');
        ctx.fillStyle = bulgeGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, 25, 0, 2 * Math.PI);
        ctx.fill();

        // Draw Spiral Arm background gas (visual effect)
        ctx.save();
        ctx.globalAlpha = 0.07;
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 15;
        for (let arm = 0; arm < 2; arm++) {
          ctx.beginPath();
          for (let angle = 0; angle < 4 * Math.PI; angle += 0.1) {
            const r = 10 + angle * 12;
            const theta = angle + (arm * Math.PI) + frameCountRef.current * 0.003;
            const x = cx + r * Math.cos(theta);
            const y = cy + r * Math.sin(theta);
            angle === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
          }
          ctx.stroke();
        }
        ctx.restore();

        // Update & Render Stars
        starsRef.current.forEach((star) => {
          star.theta += star.speed;
          const x = cx + star.r * Math.cos(star.theta);
          const y = cy + star.r * Math.sin(star.theta);

          ctx.fillStyle = star.color;
          ctx.beginPath();
          ctx.arc(x, y, star.size, 0, 2 * Math.PI);
          ctx.fill();
        });

        // ------------------------------------------
        // Rotation Velocity vs Radius Plot (Left side)
        // ------------------------------------------
        const gx = 45;
        const gy = 80;
        const gw = 180;
        const gh = 240;

        ctx.save();
        ctx.strokeStyle = '#27272a';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(gx - 10, gy - 20, gw + 20, gh + 40, 8);
        ctx.stroke();
        ctx.fillStyle = 'rgba(9, 9, 11, 0.7)';
        ctx.fill();

        // Draw axis lines
        ctx.strokeStyle = '#3f3f46';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(gx, gy);
        ctx.lineTo(gx, gy + gh);
        ctx.lineTo(gx + gw, gy + gh);
        ctx.stroke();

        // Axis Labels
        ctx.fillStyle = '#a1a1aa';
        ctx.font = '9px monospace';
        ctx.fillText('v (Velocity)', gx - 5, gy - 8);
        ctx.fillText('r (Radius)', gx + gw - 40, gy + gh + 12);

        // Curve 1: Newtonian Keplerian Curve (blue) - falls off
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (let r = 20; r <= gw; r++) {
          const v = Math.sqrt((galaxyMass * 100) / r) * 3;
          const px = gx + r;
          const py = gy + gh - v;
          r === 20 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        }
        ctx.stroke();

        // Curve 2: Observed Flat Curve with Tensor Condensation (red)
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        for (let r = 20; r <= gw; r++) {
          const vNewton = Math.sqrt((galaxyMass * 100) / r);
          const vFlat = chameleonCoupling * 4.5;
          const vCombined = Math.sqrt(vNewton * vNewton + vFlat * vFlat) * 3;
          const px = gx + r;
          const py = gy + gh - vCombined;
          r === 20 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        }
        ctx.stroke();

        // Plot current star speeds as white dots
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        starsRef.current.slice(0, 30).forEach((star) => {
          const r = star.r - 20;
          if (r > 0 && r < gw) {
            const vNewton = Math.sqrt((galaxyMass * 100) / star.r);
            const vFlat = chameleonCoupling * 4.5;
            const vCombined = Math.sqrt(vNewton * vNewton + vFlat * vFlat) * 3;
            ctx.beginPath();
            ctx.arc(gx + r, gy + gh - vCombined, 2, 0, 2 * Math.PI);
            ctx.fill();
          }
        });

        // Legends
        ctx.font = 'bold 8.5px monospace';
        ctx.fillStyle = '#ef4444';
        ctx.fillText('Observed Rotation (Flat)', gx + 20, gy + 15);
        ctx.fillStyle = '#3b82f6';
        ctx.fillText('Newtonian Gravity Well', gx + 20, gy + 30);
        ctx.fillStyle = '#fef08a';
        ctx.fillText('M_eff(r) = M_vis + 4π/c² ∫⟨Ṽ₀₀⟩√g_rr r\'² dr\'', gx + 20, gy + 48);
        ctx.fillStyle = 'rgba(250, 204, 21, 0.85)';
        ctx.fillText('Tensor Condensation Halo (φ)', gx + 20, gy + 63);
        ctx.restore();

        // Title Info
        ctx.fillStyle = '#f4f4f5';
        ctx.font = 'bold 11px monospace';
        ctx.fillText('GALAXY ROTATION CURVES (DARK MATTER)', 20, 30);

      } else if (simMode === 'expansion') {
        // ==========================================
        // Mode B: Chameleon Field Expansion (Dark Energy)
        // ==========================================
        const cx = width * 0.65;
        const cy = height / 2;

        // Dynamic scale factor a(t) calculation
        const wCoeff = -1.0 + 1.0 / (1.0 + Math.exp(-(matterDensity - 5.0) / 1.2));
        const effectiveExpansion = Math.abs(wCoeff); // between 0.015 and 0.985
        const aFactor = 1.0 + Math.pow(frameCountRef.current * 0.004 * (effectiveExpansion * 4.0), 1.8);
        const loopFactor = (aFactor % 180);

        // Draw Expanding Void grid cells
        ctx.save();
        ctx.strokeStyle = 'rgba(168, 85, 247, 0.15)';
        ctx.lineWidth = 1;
        const gridSize = 40;
        for (let x = -gridSize * 4; x <= width + gridSize * 4; x += gridSize) {
          for (let y = -gridSize * 4; y <= height + gridSize * 4; y += gridSize) {
            const dx = x - cx;
            const dy = y - cy;

            // Shift grid based on void expansion
            const expansionShift = 1 + (loopFactor * 0.015);
            const px = cx + dx * expansionShift;
            const py = cy + dy * expansionShift;

            if (px > 0 && px < width && py > 0 && py < height) {
              ctx.strokeRect(px - 15, py - 15, 30, 30);
            }
          }
        }
        ctx.restore();

        // Outward radiation pressure vector arrows
        ctx.save();
        ctx.strokeStyle = '#a855f7';
        ctx.fillStyle = '#a855f7';
        ctx.lineWidth = 1.5;
        const step = 60;
        for (let x = step; x < width; x += step) {
          for (let y = step; y < height; y += step) {
            const dx = x - cx;
            const dy = y - cy;
            const r = Math.sqrt(dx * dx + dy * dy);
            if (r < 30 || r > 240) continue;

            const angle = Math.atan2(dy, dx);
            const forceLen = Math.min(18, (r * 0.08) * (effectiveExpansion * 1.5));
            const endX = x + Math.cos(angle) * forceLen;
            const endY = y + Math.sin(angle) * forceLen;

            // Draw arrow
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(endX, endY);
            ctx.stroke();

            // Arrow head
            ctx.beginPath();
            ctx.arc(endX, endY, 2, 0, 2 * Math.PI);
            ctx.fill();
          }
        }
        ctx.restore();

        // ------------------------------------------
        // Scale Factor a(t) chart (Left Top)
        // ------------------------------------------
        const gx = 45;
        const gy = 80;
        const gw = 180;
        const gh = 100;

        ctx.save();
        ctx.strokeStyle = '#27272a';
        ctx.beginPath();
        ctx.roundRect(gx - 10, gy - 20, gw + 20, gh + 40, 8);
        ctx.stroke();
        ctx.fillStyle = 'rgba(9, 9, 11, 0.7)';
        ctx.fill();

        ctx.strokeStyle = '#3f3f46';
        ctx.beginPath();
        ctx.moveTo(gx, gy);
        ctx.lineTo(gx, gy + gh);
        ctx.lineTo(gx + gw, gy + gh);
        ctx.stroke();

        ctx.fillStyle = '#a1a1aa';
        ctx.font = '8px monospace';
        ctx.fillText('a(t) Scale', gx - 5, gy - 8);
        ctx.fillText('t (Time)', gx + gw - 35, gy + gh + 12);

        // Plot accelerating expansion curve
        ctx.strokeStyle = '#a855f7';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        for (let t = 0; t <= gw; t++) {
          const val = Math.pow(t * 0.03 * (effectiveExpansion * 3.5), 1.8) * 3;
          const py = Math.max(gy, gy + gh - val);
          t === 0 ? ctx.moveTo(gx + t, py) : ctx.lineTo(gx + t, py);
        }
        ctx.stroke();

        ctx.font = 'bold 8.5px monospace';
        ctx.fillStyle = '#a855f7';
        ctx.fillText('a(t) ∝ e^(Ht)', gx + 15, gy + 15);
        ctx.fillStyle = '#34d399';
        ctx.fillText('p_vib < 0 (Inflation)', gx + 15, gy + 30);
        ctx.restore();

        // ------------------------------------------
        // S-Curve w(ρ_m) chart (Left Bottom)
        // ------------------------------------------
        const gx2 = 45;
        const gy2 = 230;
        const gw2 = 180;
        const gh2 = 100;

        ctx.save();
        ctx.strokeStyle = '#27272a';
        ctx.beginPath();
        ctx.roundRect(gx2 - 10, gy2 - 20, gw2 + 20, gh2 + 40, 8);
        ctx.stroke();
        ctx.fillStyle = 'rgba(9, 9, 11, 0.7)';
        ctx.fill();

        ctx.strokeStyle = '#3f3f46';
        ctx.beginPath();
        ctx.moveTo(gx2, gy2);
        ctx.lineTo(gx2, gy2 + gh2);
        ctx.lineTo(gx2 + gw2, gy2 + gh2);
        ctx.stroke();

        ctx.fillStyle = '#a1a1aa';
        ctx.font = '8px monospace';
        ctx.fillText('w (E.O.S)', gx2 - 5, gy2 - 8);
        ctx.fillText('ρ_m (Density)', gx2 + gw2 - 50, gy2 + gh2 + 12);

        // Plot Sigmoid chameleon EOS curve
        ctx.strokeStyle = '#34d399';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        for (let dx = 0; dx <= gw2; dx++) {
          const rho = (dx / gw2) * 10;
          const wVal = -1.0 + 1.0 / (1.0 + Math.exp(-(rho - 5.0) / 1.2));
          const py = gy2 + gh2 - (wVal + 1.0) * gh2;
          dx === 0 ? ctx.moveTo(gx2 + dx, py) : ctx.lineTo(gx2 + dx, py);
        }
        ctx.stroke();

        // Plot current operating point
        const currentX = gx2 + (matterDensity / 10) * gw2;
        const currentY = gy2 + gh2 - (wCoeff + 1.0) * gh2;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(currentX, currentY, 4, 0, 2 * Math.PI);
        ctx.fill();
        ctx.strokeStyle = '#a855f7';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.font = 'bold 8px monospace';
        ctx.fillStyle = '#34d399';
        ctx.fillText(`w = ${wCoeff.toFixed(2)}`, gx2 + 15, gy2 + 15);
        ctx.fillStyle = '#a1a1aa';
        ctx.fillText(`ρ_crit=5.0, σ=1.2`, gx2 + 15, gy2 + 28);
        ctx.restore();

        // Title Info
        ctx.fillStyle = '#f4f4f5';
        ctx.font = 'bold 11px monospace';
        ctx.fillText('CHAMELEON VACUUM PRESSURE (DARK ENERGY)', 20, 30);

      } else if (simMode === 'lensing') {
        // ==========================================
        // Mode C: Stochastic Lensing (3D Gravitational Field)
        // ==========================================
        const centerX = width / 2;
        const centerY = height / 2;
        const scale = 50;

        // Trace Photon paths from left to right
        if (frameCountRef.current % 15 === 0 && photonsRef.current.length < 45) {
          const initY = -120 + Math.random() * 240;
          // Spawn RGB triplet with a slight vertical separation (dy = -1, 0, 1) to render parallel lines
          const offsets = [
            { dy: -1, color: '#ef4444' }, // Red
            { dy: 0, color: '#10b981' },  // Green
            { dy: 1, color: '#3b82f6' }   // Blue
          ];
          offsets.forEach(({ dy, color }) => {
            photonsRef.current.push({
              x: -240,
              y: initY + dy,
              vx: 4.5,
              vy: 0,
              active: true,
              isTimeLeaped: false,
              trail: [],
              color,
              initY
            });
          });
        }

        // Draw 3D-like warped gravitational space grids
        const gridPoints: { px: number; py: number; depth: number }[][] = [];

        const project = (x: number, y: number, z: number) => {
          const cosY = Math.cos(angleY), sinY = Math.sin(angleY);
          const x1 = x * cosY - y * sinY;
          const y1 = x * sinY + y * cosY;
          const cosX = Math.cos(angleX), sinX = Math.sin(angleX);
          const z2 = z * cosX - y1 * sinX;
          const y2 = z * sinX + y1 * cosX;
          const projX = (x1 * 8) / (y2 + 8) * scale + centerX;
          const projY = centerY - (z2 * 8) / (z2 + 8) * scale;
          return { px: projX, py: projY, depth: y2 };
        };

        const tWave = frameCountRef.current * 0.15;

        // Renders gravity well depression z = -M / (r + eps) + wave ripples h_vib
        for (let u = -6; u <= 6; u++) {
          const idx = u + 6;
          gridPoints[idx] = [];
          for (let v = -6; v <= 6; v++) {
            const dist = Math.sqrt(u * u + v * v) + 0.1;
            const zGravity = -chameleonCoupling * 1.8 / dist;
            
            // Add microscopic high-frequency metric perturbation ripple
            const ripple = Math.sin(dist * 2.5 - tWave) * 0.12 * turbulentNoise;
            const zTotal = zGravity + ripple;
            
            gridPoints[idx].push(project(u * 35, v * 35, zTotal * 15));
          }
        }

        // Draw space grid lines
        ctx.strokeStyle = 'rgba(59, 130, 246, 0.08)';
        ctx.lineWidth = 0.8;
        for (let i = 0; i < 13; i++) {
          ctx.beginPath();
          for (let j = 0; j < 13; j++) {
            j === 0 ? ctx.moveTo(gridPoints[i][j].px, gridPoints[i][j].py) : ctx.lineTo(gridPoints[i][j].px, gridPoints[i][j].py);
          }
          ctx.stroke();
        }
        for (let j = 0; j < 13; j++) {
          ctx.beginPath();
          for (let i = 0; i < 13; i++) {
            i === 0 ? ctx.moveTo(gridPoints[i][j].px, gridPoints[i][j].py) : ctx.lineTo(gridPoints[i][j].px, gridPoints[i][j].py);
          }
          ctx.stroke();
        }

        // Draw central Black Hole
        const blackHoleProj = project(0, 0, 0);
        const bhGrad = ctx.createRadialGradient(blackHoleProj.px, blackHoleProj.py, 2, blackHoleProj.px, blackHoleProj.py, 20);
        bhGrad.addColorStop(0, '#000000');
        bhGrad.addColorStop(0.4, '#09090b');
        bhGrad.addColorStop(0.7, '#f59e0b');
        bhGrad.addColorStop(1, 'rgba(245, 158, 11, 0)');
        ctx.fillStyle = bhGrad;
        ctx.beginPath();
        ctx.arc(blackHoleProj.px, blackHoleProj.py, 20, 0, 2 * Math.PI);
        ctx.fill();

        // Render fading time-leap shortcut lines and negative pressure vector rings
        flashesRef.current.forEach((flash) => {
          ctx.save();
          // 1. Geometrical path shortcut dashed line
          ctx.strokeStyle = `rgba(250, 204, 21, ${flash.alpha * 0.75})`;
          ctx.setLineDash([4, 3]);
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.moveTo(flash.startPx, flash.startPy);
          ctx.lineTo(flash.endPx, flash.endPy);
          ctx.stroke();

          // 2. Outward pointing negative pressure ring (p_vib < 0) keeping the junction open
          const blackHoleProj = project(0, 0, 0);
          ctx.strokeStyle = `rgba(168, 85, 247, ${flash.alpha * 0.8})`;
          ctx.lineWidth = 1.2;
          const ringRadius = 25 + (1.0 - flash.alpha) * 35;
          ctx.beginPath();
          ctx.arc(blackHoleProj.px, blackHoleProj.py, ringRadius, 0, 2 * Math.PI);
          ctx.stroke();

          // Outward pointing arrows on the ring
          for (let a = 0; a < 2 * Math.PI; a += Math.PI / 4) {
            const ax = blackHoleProj.px + Math.cos(a) * ringRadius;
            const ay = blackHoleProj.py + Math.sin(a) * ringRadius;
            const arrowLen = 5;
            const ex = ax + Math.cos(a) * arrowLen;
            const ey = ay + Math.sin(a) * arrowLen;
            ctx.beginPath();
            ctx.moveTo(ax, ay);
            ctx.lineTo(ex, ey);
            ctx.stroke();
          }

          // 3. Flash circle at end
          ctx.fillStyle = `rgba(250, 204, 21, ${flash.alpha * 0.9})`;
          ctx.beginPath();
          ctx.arc(flash.endPx, flash.endPy, 4 + 4 * flash.alpha, 0, 2 * Math.PI);
          ctx.fill();

          ctx.font = 'bold 8px monospace';
          ctx.fillStyle = `rgba(253, 224, 71, ${flash.alpha})`;
          ctx.fillText('Time-Leap (Junction, p_vib < 0)', flash.endPx + 8, flash.endPy - 4);
          ctx.restore();

          flash.alpha -= 0.025; // fade speed
        });
        flashesRef.current = flashesRef.current.filter((f) => f.alpha > 0);

        // GLSL-like deterministic hash to ensure R, G, B triplets share identical paths
        const hash = (x1: number, y1: number) => {
          const val = Math.sin(x1 * 12.9898 + y1 * 78.233) * 43758.5453;
          return val - Math.floor(val);
        };

        // Update and draw photons
        photonsRef.current.forEach((photon) => {
          if (!photon.active) return;

          // Draw trail
          ctx.strokeStyle = photon.color + '26'; // add 15% opacity in hex
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          photon.trail.forEach((t, idx) => {
            idx === 0 ? ctx.moveTo(t.px, t.py) : ctx.lineTo(t.px, t.py);
          });
          ctx.stroke();

          // Push trail point (projected coordinates)
          const currentProj = project(photon.x, photon.y, 0);
          photon.trail.push(currentProj);
          if (photon.trail.length > 20) photon.trail.shift();

          // Gravity deflection calculation (Lorentzian deflection force)
          const distSq = photon.x * photon.x + photon.y * photon.y + 100;
          const force = (chameleonCoupling * 1800) / distSq;
          const angle = Math.atan2(-photon.y, -photon.x);

          photon.vx += Math.cos(angle) * force * 0.01;
          photon.vy += Math.sin(angle) * force * 0.01;

          // V8 Phase Turbulence: Achromatic stochastic geodesic deviation
          if (turbulentNoise > 0) {
            // Noise is deterministic based on current photon x coordinate (discretized) and initial Y coordinate of the triplet
            const noise = (hash(Math.floor(photon.x), photon.initY) - 0.5) * turbulentNoise * 1.5;
            photon.vy += noise;
          }

          // Time-Leap Jump Condition:
          if (photon.x > -25 && photon.x < 5 && !photon.isTimeLeaped && chameleonCoupling > 1.3 && turbulentNoise > 0.4) {
            const startX = photon.x;
            const startY = photon.y;

            photon.isTimeLeaped = true;
            photon.x += 130; // Jump across the central wormhole region
            photon.trail = []; // Clear current solid trail

            const startProj = project(startX, startY, 0);
            const endProj = project(photon.x, photon.y, 0);

            // Register fading time-leap trace
            flashesRef.current.push({
              startPx: startProj.px,
              startPy: startProj.py,
              endPx: endProj.px,
              endPy: endProj.py,
              alpha: 1.0
            });
          }

          // Kinematic update
          photon.x += photon.vx;
          photon.y += photon.vy;

          // Draw photon particle
          ctx.fillStyle = photon.color;
          ctx.beginPath();
          ctx.arc(currentProj.px, currentProj.py, 2, 0, 2 * Math.PI);
          ctx.fill();

          // Deactivate if out of boundaries
          if (photon.x > 320 || photon.x < -320 || photon.y > 320 || photon.y < -320) {
            photon.active = false;
          }
        });

        photonsRef.current = photonsRef.current.filter((p) => p.active || p.trail.length > 0);

        // UI Tip text for Lensing Mode
        ctx.fillStyle = '#9ca3af';
        ctx.font = '9px monospace';
        ctx.fillText('🔄 Click & Drag canvas to rotate gravitational grid', 20, height - 20);

        // Title Info
        ctx.fillStyle = '#f4f4f5';
        ctx.font = 'bold 11px monospace';
        ctx.fillText('STOCHASTIC GEODESIC LENSING (MICRO-LENSING)', 20, 30);
      }
    };

    const loop = () => {
      render();
      animId = requestAnimationFrame(loop);
    };
    loop();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [simMode, galaxyMass, chameleonCoupling, matterDensity, turbulentNoise, angleX, angleY]);

  return (
    <div className="w-full">
      <div className="flex flex-col lg:flex-row gap-4 items-start">
        {/* Simulator Area */}
        <div className="flex-1 w-full space-y-4">
          {/* Tab Selector */}
          <div className="flex bg-zinc-950 p-1 rounded-lg border border-zinc-800 gap-1 w-full max-w-lg">
            <button
              onClick={() => setSimMode('rotation')}
              className={`flex-1 py-1.5 px-3 rounded-md text-[10px] md:text-xs font-mono font-bold transition-all ${simMode === 'rotation' ? 'bg-[#3b82f6] text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'}`}
            >
              Mode A: Dark Matter Curve
            </button>
            <button
              onClick={() => setSimMode('expansion')}
              className={`flex-1 py-1.5 px-3 rounded-md text-[10px] md:text-xs font-mono font-bold transition-all ${simMode === 'expansion' ? 'bg-[#a855f7] text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'}`}
            >
              Mode B: Void Expansion
            </button>
            <button
              onClick={() => setSimMode('lensing')}
              className={`flex-1 py-1.5 px-3 rounded-md text-[10px] md:text-xs font-mono font-bold transition-all ${simMode === 'lensing' ? 'bg-[#f59e0b] text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'}`}
            >
              Mode C: Geodesic Lensing
            </button>
          </div>

          {/* Canvas block */}
          <div className="bg-zinc-900/50 rounded-xl overflow-hidden border border-zinc-800 p-2">
            <canvas
              ref={canvasRef}
              width={600}
              height={420}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUpOrLeave}
              onMouseLeave={handleMouseUpOrLeave}
              className="w-full h-auto rounded-lg shadow-inner"
            />
          </div>
        </div>

        {/* Controllers Panel */}
        <div className="w-full lg:w-72 flex flex-col space-y-4 bg-zinc-900/40 p-5 rounded-xl border border-zinc-800">
          <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider font-mono">Parameters Control</h4>

          {simMode === 'rotation' && (
            <>
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-zinc-400 font-mono">
                  <span>Galaxy Core Mass (M)</span>
                  <span className="text-blue-400 font-mono">{galaxyMass} M☉</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="100"
                  value={galaxyMass}
                  onChange={(e) => setGalaxyMass(Number(e.target.value))}
                  className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
              </div>

              <div className="space-y-1 mt-2">
                <div className="flex justify-between text-xs text-zinc-400 font-mono">
                  <span>Chameleon Density (φ)</span>
                  <span className="text-blue-400 font-mono">{chameleonCoupling} GeV</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="3.0"
                  step="0.1"
                  value={chameleonCoupling}
                  onChange={(e) => setChameleonCoupling(Number(e.target.value))}
                  className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
              </div>
            </>
          )}

          {simMode === 'expansion' && (
            <>
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-zinc-400 font-mono">
                  <span>Local Density (ρ_m)</span>
                  <span className="text-purple-400 font-mono">{matterDensity.toFixed(1)} GeV</span>
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="10.0"
                  step="0.1"
                  value={matterDensity}
                  onChange={(e) => setMatterDensity(Number(e.target.value))}
                  className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
                />
              </div>

              <div className="space-y-1 mt-2">
                <div className="flex justify-between text-xs text-zinc-400 font-mono">
                  <span>E.O.S w(ρ_m) Value</span>
                  <span className="text-emerald-400 font-mono">w = {(-1.0 + 1.0 / (1.0 + Math.exp(-(matterDensity - 5.0) / 1.2))).toFixed(2)}</span>
                </div>
                <div className="p-3 bg-zinc-950 rounded border border-zinc-850 font-mono text-[9px] text-zinc-500 space-y-1">
                  <div>w ≈ -1 + 1 / (1 + e^(-(ρ_m - ρ_crit)/σ))</div>
                  <div className="text-zinc-600">ρ_m → 0: w → -1 (Dark Energy)</div>
                  <div className="text-zinc-600">ρ_m → 10: w → 0 (Dark Matter)</div>
                </div>
              </div>
            </>
          )}

          {simMode === 'lensing' && (
            <>
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-zinc-400 font-mono">
                  <span>Deflection Strength (M_bh)</span>
                  <span className="text-amber-400 font-mono">{chameleonCoupling} M_sol</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="3.0"
                  step="0.1"
                  value={chameleonCoupling}
                  onChange={(e) => setChameleonCoupling(Number(e.target.value))}
                  className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                />
              </div>

              <div className="space-y-1 mt-2">
                <div className="flex justify-between text-xs text-zinc-400 font-mono">
                  <span>Phase Turbulence (δΓ)</span>
                  <span className="text-amber-400 font-mono">{turbulentNoise.toFixed(1)} GeV</span>
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="2.0"
                  step="0.1"
                  value={turbulentNoise}
                  onChange={(e) => setTurbulentNoise(Number(e.target.value))}
                  className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                />
              </div>
            </>
          )}

          {/* Reset button */}
          <button
            onClick={resetSimulation}
            className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-xs font-mono font-bold transition-all shadow-inner mt-4"
          >
            Reset Simulation
          </button>
        </div>
      </div>
    </div>
  );
};
