import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

type Props = {
  demoSignal: number;
  reduceMotion?: boolean;
};

type ArmRig = {
  shoulder: THREE.Group;
  elbow: THREE.Group;
  hand: THREE.Group;
  fingers: THREE.Group[];
  side: number;
};

function addMesh<T extends THREE.BufferGeometry>(
  parent: THREE.Object3D,
  geometry: T,
  material: THREE.Material,
  position: [number, number, number],
  scale?: [number, number, number],
) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(...position);
  if (scale) mesh.scale.set(...scale);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function makeAvatar(scene: THREE.Scene) {
  const model = new THREE.Group();
  scene.add(model);

  const skin = new THREE.MeshPhysicalMaterial({ color: '#b97858', roughness: 0.66, clearcoat: 0.08 });
  const skinLight = new THREE.MeshPhysicalMaterial({ color: '#cc9170', roughness: 0.62 });
  const shirt = new THREE.MeshPhysicalMaterial({ color: '#267eae', roughness: 0.48, metalness: 0.02, clearcoat: 0.24 });
  const shirtLight = new THREE.MeshStandardMaterial({ color: '#66c0e5', roughness: 0.48 });
  const hair = new THREE.MeshStandardMaterial({ color: '#202d3b', roughness: 0.86 });
  const dark = new THREE.MeshStandardMaterial({ color: '#172536', roughness: 0.58 });
  const white = new THREE.MeshStandardMaterial({ color: '#f8fcff', roughness: 0.3 });
  const iris = new THREE.MeshStandardMaterial({ color: '#49352c', roughness: 0.32 });

  // Torso, collar and neck.
  addMesh(model, new THREE.CapsuleGeometry(0.43, 0.54, 8, 18), shirt, [0, 0.56, 0]);
  addMesh(model, new THREE.CylinderGeometry(0.14, 0.15, 0.22, 24), skin, [0, 1.13, 0]);
  const collar = addMesh(model, new THREE.TorusGeometry(0.17, 0.025, 10, 32), shirtLight, [0, 1.0, 0.01]);
  collar.rotation.x = Math.PI / 2;

  // A softly stylized face with clear nonverbal expression.
  const head = new THREE.Group();
  head.position.set(0, 1.48, 0.015);
  model.add(head);
  addMesh(head, new THREE.SphereGeometry(0.31, 40, 32), skinLight, [0, 0, 0], [0.88, 1.08, 0.82]);
  addMesh(head, new THREE.SphereGeometry(0.31, 32, 20), hair, [0, 0.19, -0.035], [0.91, 0.59, 0.86]);
  addMesh(head, new THREE.SphereGeometry(0.12, 24, 16), hair, [-0.235, 0.09, 0.035], [0.56, 1.35, 0.78]);
  addMesh(head, new THREE.SphereGeometry(0.12, 24, 16), hair, [0.235, 0.09, 0.035], [0.56, 1.35, 0.78]);
  for (const side of [-1, 1]) {
    addMesh(head, new THREE.SphereGeometry(0.052, 20, 16), white, [side * 0.105, 0.015, 0.237], [1, 1.06, 0.38]);
    addMesh(head, new THREE.SphereGeometry(0.027, 16, 12), iris, [side * 0.105, 0.014, 0.258], [1, 1, 0.55]);
    addMesh(head, new THREE.SphereGeometry(0.012, 12, 10), dark, [side * 0.105, 0.014, 0.268]);
    addMesh(head, new THREE.SphereGeometry(0.064, 18, 14), skin, [side * 0.27, -0.07, 0.035], [0.43, 0.52, 0.35]);
    const brow = addMesh(head, new THREE.CapsuleGeometry(0.012, 0.065, 4, 8), hair, [side * 0.105, 0.094, 0.23]);
    brow.rotation.z = side * -0.12;
  }
  addMesh(head, new THREE.SphereGeometry(0.043, 18, 14), skin, [0, -0.055, 0.245], [0.78, 1.08, 0.8]);
  const smile = addMesh(head, new THREE.TorusGeometry(0.064, 0.008, 8, 24, Math.PI), dark, [0, -0.145, 0.222]);
  smile.rotation.z = Math.PI;

  const arms: ArmRig[] = [];
  const capsule = (radius: number, length: number) => new THREE.CapsuleGeometry(radius, length, 7, 14);

  for (const side of [-1, 1]) {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * 0.39, 0.91, 0);
    model.add(shoulder);
    addMesh(shoulder, new THREE.SphereGeometry(0.155, 24, 18), shirt, [side * -0.015, -0.025, 0]);
    addMesh(shoulder, capsule(0.125, 0.32), shirt, [side * 0.045, -0.245, 0]);
    addMesh(shoulder, new THREE.SphereGeometry(0.112, 20, 16), skin, [side * 0.045, -0.49, 0.005]);

    const elbow = new THREE.Group();
    elbow.position.set(side * 0.045, -0.49, 0.005);
    shoulder.add(elbow);
    addMesh(elbow, capsule(0.095, 0.31), skin, [side * 0.035, -0.22, 0]);
    addMesh(elbow, new THREE.SphereGeometry(0.085, 18, 14), skinLight, [side * 0.035, -0.435, 0]);

    const hand = new THREE.Group();
    hand.position.set(side * 0.035, -0.46, 0.005);
    elbow.add(hand);
    addMesh(hand, new THREE.SphereGeometry(0.115, 24, 18), skinLight, [0, -0.075, 0.012], [0.9, 1.12, 0.5]);

    const fingers: THREE.Group[] = [];
    const fingerXs = [-0.075, -0.025, 0.027, 0.078];
    const fingerLengths = [0.11, 0.14, 0.13, 0.105];
    fingerXs.forEach((x, index) => {
      const finger = new THREE.Group();
      finger.position.set(x, -0.15, 0.018);
      hand.add(finger);
      addMesh(finger, capsule(0.019, fingerLengths[index] * 0.55), skinLight, [0, -fingerLengths[index] * 0.36, 0]);
      const tip = new THREE.Group();
      tip.position.y = -fingerLengths[index] * 0.69;
      finger.add(tip);
      addMesh(tip, capsule(0.016, fingerLengths[index] * 0.34), skinLight, [0, -fingerLengths[index] * 0.2, 0]);
      fingers.push(finger);
    });
    const thumb = new THREE.Group();
    thumb.position.set(side * 0.105, -0.07, 0.025);
    thumb.rotation.z = side * -0.72;
    hand.add(thumb);
    addMesh(thumb, capsule(0.023, 0.075), skinLight, [0, -0.055, 0]);
    fingers.push(thumb);

    arms.push({ shoulder, elbow, hand, fingers, side });
  }

  // Small chest detail and a subtle floating ground shadow.
  addMesh(model, new THREE.SphereGeometry(0.045, 20, 16), shirtLight, [0, 0.72, 0.405], [1, 1.35, 0.25]);
  const shadow = addMesh(scene, new THREE.CircleGeometry(0.72, 48), new THREE.MeshBasicMaterial({ color: '#75a9c4', transparent: true, opacity: 0.14 }), [0, -0.04, 0]);
  shadow.rotation.x = -Math.PI / 2;
  shadow.scale.set(1.15, 0.38, 1);

  model.position.y = -0.08;
  return { model, head, arms };
}

export default function LibrasAvatar3D({ demoSignal, reduceMotion = false }: Props) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [webglError, setWebglError] = useState(false);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
    } catch {
      setWebglError(true);
      return;
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.65));
    renderer.setSize(mount.clientWidth, mount.clientHeight, false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.domElement.setAttribute('aria-label', 'Avatar humanoide 3D articulado do AURA. A animação exibida é demonstrativa e não representa sinais de Libras.');
    renderer.domElement.setAttribute('role', 'img');
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, mount.clientWidth / Math.max(mount.clientHeight, 1), 0.1, 30);
    camera.position.set(0, 0.9, 5.8);
    camera.lookAt(0, 0.85, 0);

    scene.add(new THREE.HemisphereLight('#e9f8ff', '#8fb6d0', 2.0));
    const keyLight = new THREE.DirectionalLight('#ffffff', 2.35);
    keyLight.position.set(-2.8, 4.2, 4.5);
    keyLight.castShadow = true;
    scene.add(keyLight);
    const fillLight = new THREE.DirectionalLight('#77d2f3', 1.15);
    fillLight.position.set(3.5, 1.4, 2.5);
    scene.add(fillLight);
    const rimLight = new THREE.DirectionalLight('#b2c8ff', 1.6);
    rimLight.position.set(0.5, 3.0, -3.0);
    scene.add(rimLight);

    const { model, head, arms } = makeAvatar(scene);
    const clock = new THREE.Clock();
    let frame = 0;
    let demoStartedAt = -1;
    let pointerDown = false;
    let targetYaw = 0;
    let targetPitch = 0;
    let disposed = false;

    const onPointerDown = (event: PointerEvent) => {
      pointerDown = true;
      renderer.domElement.setPointerCapture?.(event.pointerId);
    };
    const onPointerUp = () => { pointerDown = false; };
    const onPointerMove = (event: PointerEvent) => {
      if (!pointerDown || reduceMotion) return;
      const rect = renderer.domElement.getBoundingClientRect();
      targetYaw = THREE.MathUtils.clamp(((event.clientX - rect.left) / rect.width - 0.5) * 0.78, -0.42, 0.42);
      targetPitch = THREE.MathUtils.clamp(((event.clientY - rect.top) / rect.height - 0.5) * 0.18, -0.1, 0.1);
    };
    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointerup', onPointerUp);
    renderer.domElement.addEventListener('pointercancel', onPointerUp);
    renderer.domElement.addEventListener('pointermove', onPointerMove);

    const render = () => {
      if (disposed) return;
      if (!reduceMotion) frame = window.requestAnimationFrame(render);
      const delta = clock.getDelta();
      const elapsed = clock.elapsedTime;
      const demo = demoStartedAt >= 0 && elapsed - demoStartedAt < 3.2;
      if (demoStartedAt >= 0 && !demo) demoStartedAt = -1;

      if (!reduceMotion) {
        model.position.y = -0.08 + Math.sin(elapsed * 1.55) * 0.018;
        model.rotation.y = THREE.MathUtils.damp(model.rotation.y, targetYaw, 4, delta);
        model.rotation.x = THREE.MathUtils.damp(model.rotation.x, targetPitch, 4, delta);
        head.rotation.z = Math.sin(elapsed * 1.0) * 0.018;
      }

      arms.forEach((arm) => {
        const base = arm.side * 0.12;
        let shoulderZ = base;
        let elbowZ = arm.side * -0.08;
        let handZ = arm.side * 0.05;
        if (demo && arm.side === 1) {
          const progress = THREE.MathUtils.clamp((elapsed - demoStartedAt) / 0.48, 0, 1);
          const settle = THREE.MathUtils.smoothstep(progress, 0, 1);
          const wave = Math.sin((elapsed - demoStartedAt) * 8.5) * 0.12;
          shoulderZ = THREE.MathUtils.lerp(base, 2.12 + wave, settle);
          elbowZ = THREE.MathUtils.lerp(-0.08, -0.48 + wave * 0.45, settle);
          handZ = THREE.MathUtils.lerp(0.05, wave * 1.2, settle);
        } else if (demo && arm.side === -1) {
          shoulderZ = THREE.MathUtils.lerp(base, -0.5, THREE.MathUtils.smoothstep((elapsed - demoStartedAt) / 0.7, 0, 1));
          elbowZ = -0.12;
        }
        if (reduceMotion) {
          arm.shoulder.rotation.z = base;
          arm.elbow.rotation.z = arm.side * -0.08;
        } else {
          arm.shoulder.rotation.z = THREE.MathUtils.damp(arm.shoulder.rotation.z, shoulderZ, 7, 0.016);
          arm.elbow.rotation.z = THREE.MathUtils.damp(arm.elbow.rotation.z, elbowZ, 7, 0.016);
          arm.hand.rotation.z = THREE.MathUtils.damp(arm.hand.rotation.z, handZ, 7, 0.016);
          arm.fingers.forEach((finger, index) => {
            const curl = demo ? Math.sin(elapsed * 5 + index * 0.5) * 0.12 : Math.sin(elapsed * 0.8 + index) * 0.015;
            finger.rotation.z = THREE.MathUtils.damp(finger.rotation.z, curl, 6, 0.016);
          });
        }
      });

      renderer.render(scene, camera);
    };

    const resizeObserver = new ResizeObserver(() => {
      if (!mount.clientWidth || !mount.clientHeight) return;
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight, false);
    });
    resizeObserver.observe(mount);
    render();

    const handleVisibility = () => {
      if (document.hidden) window.cancelAnimationFrame(frame);
      else if (!disposed) render();
    };
    document.addEventListener('visibilitychange', handleVisibility);

    const startDemo = () => {
      demoStartedAt = clock.getElapsedTime();
      if (reduceMotion) {
        arms[1].shoulder.rotation.z = 2.12;
        arms[1].elbow.rotation.z = -0.48;
        renderer.render(scene, camera);
      }
    };
    if (demoSignal > 0) startDemo();
    const demoEvent = () => startDemo();
    mount.addEventListener('aura-avatar-demo', demoEvent);

    return () => {
      disposed = true;
      window.cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      document.removeEventListener('visibilitychange', handleVisibility);
      mount.removeEventListener('aura-avatar-demo', demoEvent);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      renderer.domElement.removeEventListener('pointercancel', onPointerUp);
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach((material) => material.dispose());
        }
      });
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [reduceMotion]);

  useEffect(() => {
    if (demoSignal === 0) return;
    const mount = mountRef.current;
    mount?.dispatchEvent(new Event('aura-avatar-demo'));
  }, [demoSignal]);

  return (
    <div className="aura-avatar3d-wrap">
      <div className="aura-avatar3d-badge"><span className="aura-avatar3d-live-dot" /> AVATAR 3D · AURA</div>
      <div className="aura-avatar3d-canvas" ref={mountRef}>
        {webglError && <div className="aura-avatar3d-error"><strong>Não foi possível abrir o avatar 3D.</strong><span>Verifique se a aceleração de hardware está habilitada no navegador.</span></div>}
      </div>
      <div className="aura-avatar3d-caption"><span>Arraste para girar</span><span>Modelo articulado demonstrativo</span></div>
    </div>
  );
}
