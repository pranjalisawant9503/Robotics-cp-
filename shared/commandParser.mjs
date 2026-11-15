/**
 * Deterministic stand-in for the Autonomous Brain.
 * Same JSON contract a later LLM parser must return.
 * Units in the plan params are millimetres / degrees, matching the arm scene.
 */

const REACH_MM = 620;
const BASE_Z = 120;
const GRIPPER_MAX_MM = 55;
const HOME = [0, 20, -20, 0, 0, 0];

export const DEFAULT_SCENE_OBJECTS = [
  { id: 'cube_red_1', label: 'red_cube', color: '#f43f5e', position: [140, -50, 20], kind: 'cube', size_mm: 28 },
  { id: 'cube_blue_1', label: 'blue_cube', color: '#3b82f6', position: [90, -110, 20], kind: 'cube', size_mm: 28 },
  { id: 'cube_yellow_1', label: 'yellow_cube', color: '#eab308', position: [40, -70, 20], kind: 'cube', size_mm: 28 },
  { id: 'cyl_green_1', label: 'green_cylinder', color: '#10b981', position: [100, -90, 25], kind: 'cylinder', size_mm: 28 },
  { id: 'zone_blue', label: 'blue_zone', color: '#38bdf8', position: [170, 40, 2], kind: 'zone', size_mm: 120 },
  { id: 'bin_left', label: 'left_bin', color: '#fb7185', position: [-150, 30, 10], kind: 'bin', size_mm: 80 },
  { id: 'bin_right', label: 'right_bin', color: '#60a5fa', position: [40, 150, 10], kind: 'bin', size_mm: 80 },
  { id: 'bin_blue', label: 'blue_bin', color: '#2563eb', position: [180, 110, 10], kind: 'bin', size_mm: 80 }
];

function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function hypot3(x, y, z) {
  return Math.hypot(x, y, z);
}

function distFromBase(p) {
  return hypot3(p[0], p[1], p[2] - BASE_Z);
}

function nearestReachable(p) {
  const vx = p[0];
  const vy = p[1];
  const vz = p[2] - BASE_Z;
  const d = hypot3(vx, vy, vz) || 1;
  const s = (REACH_MM - 40) / d;
  return [round(vx * s), round(vy * s), round(BASE_Z + vz * s)];
}

function round(n) {
  return Math.round(n * 10) / 10;
}

function fmtM(mm) {
  return (mm / 1000).toFixed(2);
}

function isGraspable(obj) {
  return obj && obj.kind !== 'zone' && obj.kind !== 'bin' && !/zone|bin/.test(obj.label);
}

function cubesOf(objects) {
  return objects.filter((o) => isGraspable(o) && /cube|block/.test(o.label));
}

function findByWords(objects, text) {
  const q = text.toLowerCase();
  const ranked = objects
    .map((o) => {
      const label = o.label.toLowerCase().replace(/_/g, ' ');
      const id = o.id.toLowerCase().replace(/_/g, ' ');
      let score = 0;
      if (q.includes(label) || q.includes(id)) score += 5;
      const parts = label.split(' ');
      for (const part of parts) {
        if (part.length > 2 && q.includes(part)) score += 2;
      }
      return { o, score };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score);
  return ranked[0]?.o;
}

function reachIssue(actionId, p, what) {
  const d = distFromBase(p);
  if (d <= REACH_MM) return null;
  const near = nearestReachable(p);
  return {
    action_id: actionId,
    code: 'OUT_OF_REACH',
    message: `${what} is ${fmtM(d)} m from the shoulder, past the ${fmtM(REACH_MM)} m reach.`,
    suggestion: `Nearest reachable point is x ${fmtM(near[0])} m, y ${fmtM(near[1])} m, z ${fmtM(near[2])} m. Move the object there and run the command again.`
  };
}

function sizeIssue(actionId, obj) {
  const size = obj.size_mm ?? 28;
  if (size <= GRIPPER_MAX_MM) return null;
  return {
    action_id: actionId,
    code: 'COLLISION',
    message: `${obj.label} is ${size} mm wide and the gripper opens only ${GRIPPER_MAX_MM} mm.`,
    suggestion: `Use an object slimmer than ${GRIPPER_MAX_MM} mm, or open the gripper stroke in arm.config.json.`
  };
}

function payloadIssue(actionId, obj) {
  const kg = obj.mass_kg ?? 0.05;
  if (kg <= 0.8) return null;
  return {
    action_id: actionId,
    code: 'COLLISION',
    message: `${obj.label} weighs ${kg} kg, above the 0.8 kg payload.`,
    suggestion: 'Split the load or raise max_payload_kg before grasping.'
  };
}

export function parseCommand(rawText, objects = DEFAULT_SCENE_OBJECTS) {
  const raw = String(rawText || '').trim();
  const lower = raw.toLowerCase().replace(/\s+/g, ' ');
  const actions = [];
  const issues = [];
  let seq = 1;

  const push = (type, target, params = {}, issue = null) => {
    const action = {
      id: seq,
      type,
      target: target ?? null,
      params,
      status: issue ? 'failed' : 'pending',
      reason: issue ? issue.message : null
    };
    actions.push(action);
    if (issue) issues.push({ ...issue, action_id: seq });
    seq += 1;
    return action;
  };

  const finish = (handled, understood) => ({
    handled,
    plan: {
      command_id: uuid(),
      raw_text: raw,
      understood,
      actions,
      feasibility: { ok: issues.length === 0, issues }
    }
  });

  if (!lower) {
    push('wait', null, {}, {
      action_id: 1,
      code: 'UNSUPPORTED_ACTION',
      message: 'Empty command.',
      suggestion: 'Type a task such as "pick up the red cube and place it on the blue zone".'
    });
    return finish(true, 'empty command');
  }

  const repeatMatch = lower.match(/repeat\s+(\d+)\s*(?:times|x)?/);
  const repeats = repeatMatch ? Math.max(1, Math.min(12, parseInt(repeatMatch[1], 10))) : 1;
  const core = lower
    .replace(/,?\s*(?:and\s+)?repeat\s+\d+\s*(?:times|x)?/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  const runCore = (text, times) => {
    const built = buildActions(text, objects, push);
    if (!built.handled) return built;
    if (times > 1 && actions.length > 0) {
      const template = actions.map((a) => ({ ...a, params: { ...a.params } }));
      for (let n = 1; n < times; n++) {
        for (const src of template) {
          const issue = src.reason
            ? issues.find((i) => i.action_id === src.id) || {
                code: 'UNSUPPORTED_ACTION',
                message: src.reason,
                suggestion: 'Fix the first cycle before repeating.'
              }
            : null;
          push(src.type, src.target, { ...src.params, cycle: n + 1 }, issue);
        }
      }
    }
    return { handled: true, understood: built.understood + (times > 1 ? ` × ${times}` : '') };
  };

  // Far targets must win before a generic pick of a named cube.
  if (/(pick|grab|take|reach|move|get)/.test(core) && /meter/.test(core)) {
    const m = core.match(/(\d+(?:\.\d+)?)\s*meters?/);
    const meters = m ? parseFloat(m[1]) : 2;
    const target = [0, meters * 1000, 80];
    const issue = reachIssue(1, target, `The cube ${meters} m away`);
    push('pick', 'far_cube', { x: target[0], y: target[1], z: target[2], meters }, issue);
    return finish(true, `pick cube ${meters} m away — not feasible`);
  }

  const built = runCore(core, repeats);
  if (!built.handled) {
    return { handled: false, plan: null };
  }
  return finish(true, built.understood);
}

function buildActions(text, objects, push) {
  const cubes = cubesOf(objects);
  const left = objects.find((o) => o.label === 'left_bin') || objects.find((o) => /left/.test(o.label) && /bin/.test(o.label));
  const right = objects.find((o) => o.label === 'right_bin') || objects.find((o) => /right/.test(o.label) && /bin/.test(o.label));
  const blueZone = objects.find((o) => /blue/.test(o.label) && /zone/.test(o.label));

  if (/^(stop|halt|freeze|e-?stop)\b/.test(text) || text === 'emergency stop') {
    push('wait', 'estop', { estop: true });
    return { handled: true, understood: 'emergency stop' };
  }

  if (/stack/.test(text) && (/cubes/.test(text) || /tower/.test(text) || /\bthree\b|\b3\b/.test(text))) {
    if (cubes.length < 2) {
      push('stack', null, {}, {
        code: 'UNKNOWN_OBJECT',
        message: 'Need at least two cubes on the table to build a tower.',
        suggestion: 'Spawn two or more cubes, then say "stack the three cubes into one tower".'
      });
      return { handled: true, understood: 'stack cubes — missing objects' };
    }
    const base = cubes[0];
    const layers = cubes.slice(1, 3);
    layers.forEach((piece, i) => {
      const seat = [base.position[0], base.position[1], 20 + (i + 1) * 32];
      const issue = reachIssue(0, piece.position, piece.label) || reachIssue(0, seat, 'stack seat') || sizeIssue(0, piece);
      push('pick_and_place', piece.label, {
        from: piece.position,
        to: seat,
        objectId: piece.id
      }, issue);
    });
    return { handled: true, understood: `stack ${layers.length + 1} cubes into one tower on ${base.label}` };
  }

  if (/unstack/.test(text)) {
    push('unstack', cubes[0]?.label || null, { objectId: cubes[0]?.id }, cubes[0] ? null : {
      code: 'UNKNOWN_OBJECT',
      message: 'No cube is on the table to unstack.',
      suggestion: 'Stack the cubes first, then say "unstack".'
    });
    return { handled: true, understood: 'unstack the top cube' };
  }

  if (/sort/.test(text)) {
    if (!left || !right) {
      push('sort', null, {}, {
        code: 'UNKNOWN_OBJECT',
        message: 'Left and right bins are not in the scene.',
        suggestion: 'Add a left bin and a right bin, then sort again.'
      });
      return { handled: true, understood: 'sort — bins missing' };
    }
    const pile = cubes.length ? cubes : objects.filter(isGraspable);
    if (!pile.length) {
      push('sort', null, {}, {
        code: 'UNKNOWN_OBJECT',
        message: 'No cubes to sort.',
        suggestion: 'Add colored cubes, then say "sort the cubes into left and right bins by color".'
      });
      return { handled: true, understood: 'sort — no cubes' };
    }
    for (const piece of pile) {
      const warm = /red|yellow|orange|green/.test(piece.label);
      const dest = warm ? left : right;
      const seat = [dest.position[0], dest.position[1], 28];
      const issue = reachIssue(0, piece.position, piece.label) || reachIssue(0, seat, dest.label) || sizeIssue(0, piece);
      push('pick_and_place', piece.label, { from: piece.position, to: seat, objectId: piece.id, bin: dest.label }, issue);
    }
    return { handled: true, understood: 'sort cubes by color into left (warm) and right (cool) bins' };
  }

  if (/arrange/.test(text)) {
    const pile = cubes.length ? cubes : objects.filter(isGraspable);
    const shape = /circle|ring/.test(text) ? 'circle' : /grid/.test(text) ? 'grid' : 'line';
    pile.forEach((piece, i) => {
      let seat;
      if (shape === 'circle') {
        const a = (i / Math.max(pile.length, 1)) * Math.PI * 2;
        seat = [round(80 + Math.cos(a) * 70), round(-40 + Math.sin(a) * 70), 20];
      } else if (shape === 'grid') {
        seat = [round(60 + (i % 2) * 50), round(-40 - Math.floor(i / 2) * 50), 20];
      } else {
        seat = [round(40 + i * 50), -80, 20];
      }
      const issue = reachIssue(0, seat, 'arrangement seat') || sizeIssue(0, piece);
      push('arrange', piece.label, { from: piece.position, to: seat, shape, objectId: piece.id }, issue);
    });
    return { handled: true, understood: `arrange objects in a ${shape}` };
  }

  const coord = text.match(/x\s*(-?\d+(?:\.\d+)?)\s*y\s*(-?\d+(?:\.\d+)?)\s*z\s*(-?\d+(?:\.\d+)?)/);
  if (coord && /(move|go|reach|jog)/.test(text)) {
    let x = parseFloat(coord[1]);
    let y = parseFloat(coord[2]);
    let z = parseFloat(coord[3]);
    if (Math.max(Math.abs(x), Math.abs(y), Math.abs(z)) <= 3) {
      x *= 1000;
      y *= 1000;
      z *= 1000;
    }
    const p = [x, y, z];
    const issue = z < 5
      ? { code: 'COLLISION', message: 'That point is inside the table.', suggestion: 'Raise z above 0.02 m.' }
      : reachIssue(0, p, `Point (${fmtM(x)}, ${fmtM(y)}, ${fmtM(z)}) m`);
    push('move_to', 'cartesian', { x, y, z, frame: 'world_mm' }, issue);
    return { handled: true, understood: `move to x ${fmtM(x)} y ${fmtM(y)} z ${fmtM(z)} m` };
  }

  if (/(push|slide|nudge|shove)/.test(text)) {
    const obj = findByWords(objects.filter(isGraspable), text) || objects.find((o) => o.label === 'green_cylinder');
    if (!obj) {
      push('push', null, {}, {
        code: 'UNKNOWN_OBJECT',
        message: 'No object matched the push command.',
        suggestion: 'Name an object on the table, for example "push the green cylinder forward 20 cm".'
      });
      return { handled: true, understood: 'push — unknown object' };
    }
    let mm = 40;
    const cm = text.match(/(\d+(?:\.\d+)?)\s*cm/);
    const mmM = text.match(/(\d+(?:\.\d+)?)\s*mm/);
    if (cm) mm = parseFloat(cm[1]) * 10;
    else if (mmM) mm = parseFloat(mmM[1]);
    const axis = /left|right/.test(text) ? 'x' : 'y';
    const sign = /back|toward|backward/.test(text) ? -1 : 1;
    const from = obj.position;
    const to = axis === 'x'
      ? [from[0] + sign * mm, from[1], from[2]]
      : [from[0], from[1] + sign * mm, from[2]];
    const issue = reachIssue(0, from, obj.label) || reachIssue(0, to, 'push end point');
    push('push', obj.label, { objectId: obj.id, from, to, distance: mm, axis, sign }, issue);
    return { handled: true, understood: `push ${obj.label} ${sign > 0 ? 'forward' : 'back'} ${mm / 10} cm` };
  }

  if (/pull/.test(text)) {
    const obj = findByWords(objects.filter(isGraspable), text) || objects.find((o) => o.label === 'green_cylinder');
    if (!obj) {
      push('pull', null, {}, { code: 'UNKNOWN_OBJECT', message: 'Nothing to pull.', suggestion: 'Name an object on the table.' });
      return { handled: true, understood: 'pull — unknown object' };
    }
    const to = [obj.position[0], obj.position[1] - 80, obj.position[2]];
    push('pull', obj.label, { objectId: obj.id, from: obj.position, to, distance: 80, axis: 'y', sign: -1 });
    return { handled: true, understood: `pull ${obj.label} back 8 cm` };
  }

  if (/wave|hello|greet/.test(text)) {
    push('wave', 'operator', {
      joints: [
        [0, 45, 20, -30, -45, 0],
        [0, 45, 20, -30, 45, 0],
        [0, 45, 20, -30, -45, 0],
        [0, 45, 20, -30, 45, 0]
      ]
    });
    if (/home|park|rest/.test(text) || /then/.test(text)) {
      push('home', 'arm', { joints: HOME });
      return { handled: true, understood: 'wave hello, then go home' };
    }
    return { handled: true, understood: 'wave hello' };
  }

  if (/^home\b|go home|return home|park/.test(text)) {
    push('home', 'arm', { joints: HOME });
    return { handled: true, understood: 'go home' };
  }

  if (/open (the )?gripper|release/.test(text) && !/pick|place/.test(text)) {
    push('open_gripper', 'gripper', {});
    return { handled: true, understood: 'open gripper' };
  }

  if (/close (the )?gripper/.test(text)) {
    push('close_gripper', 'gripper', {});
    return { handled: true, understood: 'close gripper' };
  }

  if (/point/.test(text)) {
    const obj = findByWords(objects, text);
    const p = obj ? [obj.position[0], obj.position[1], obj.position[2] + 80] : [160, -40, 140];
    const issue = reachIssue(0, p, 'pointing pose');
    push('point', obj?.label || 'forward', { x: p[0], y: p[1], z: p[2] }, issue);
    return { handled: true, understood: obj ? `point at ${obj.label}` : 'point forward' };
  }

  if (/press|poke|tap/.test(text)) {
    const obj = findByWords(objects.filter(isGraspable), text) || objects.find((o) => o.label === 'red_cube');
    if (!obj) {
      push('press', null, {}, { code: 'UNKNOWN_OBJECT', message: 'Nothing to press.', suggestion: 'Name an object on the table.' });
      return { handled: true, understood: 'press — unknown object' };
    }
    push('press', obj.label, { x: obj.position[0], y: obj.position[1], z: obj.position[2] + 8, objectId: obj.id });
    return { handled: true, understood: `press ${obj.label}` };
  }

  if (/hand\s*over|handover|give me/.test(text)) {
    const obj = findByWords(objects.filter(isGraspable), text) || cubes[0];
    if (!obj) {
      push('hand_over', null, {}, { code: 'UNKNOWN_OBJECT', message: 'Nothing to hand over.', suggestion: 'Place a cube on the table first.' });
      return { handled: true, understood: 'hand over — unknown object' };
    }
    push('hand_over', obj.label, { objectId: obj.id, from: obj.position, to: [0, 220, 180] });
    return { handled: true, understood: `hand over ${obj.label}` };
  }

  if (/rotate/.test(text) && /object|cube|cylinder/.test(text)) {
    const obj = findByWords(objects.filter(isGraspable), text) || cubes[0];
    const deg = (text.match(/(\d+)\s*deg/) || [0, 90])[1];
    if (!obj) {
      push('rotate_object', null, {}, { code: 'UNKNOWN_OBJECT', message: 'No object to rotate.', suggestion: 'Name a cube or cylinder.' });
      return { handled: true, understood: 'rotate — unknown object' };
    }
    push('rotate_object', obj.label, { objectId: obj.id, from: obj.position, degrees: Number(deg) });
    return { handled: true, understood: `rotate ${obj.label} by ${deg}°` };
  }

  if (/^wait\b|pause for|hold for/.test(text)) {
    const sec = (text.match(/(\d+(?:\.\d+)?)\s*s/) || [0, 1])[1];
    push('wait', 'clock', { ms: Number(sec) * 1000 });
    return { handled: true, understood: `wait ${sec} s` };
  }

  const cond = text.match(/if (?:the )?([a-z0-9 _-]+?) exists,? (.*)/);
  if (cond) {
    const name = cond[1].trim();
    const rest = cond[2].trim();
    const obj = findByWords(objects, name);
    if (!obj) {
      push('conditional', name, { exists: false }, {
        code: 'UNKNOWN_OBJECT',
        message: `Condition failed: ${name} is not in the scene.`,
        suggestion: `Spawn ${name}, or drop the condition.`
      });
      return { handled: true, understood: `if ${name} exists — false, skipped` };
    }
    push('conditional', obj.label, { exists: true });
    const inner = buildActions(rest, objects, push);
    if (!inner.handled) {
      push('conditional', obj.label, {}, {
        code: 'UNSUPPORTED_ACTION',
        message: `I can see ${obj.label}, but I do not know how to "${rest}".`,
        suggestion: 'Use pick, place, push, stack, or move to x y z.'
      });
      return { handled: true, understood: `if ${obj.label} exists — then unsupported` };
    }
    return { handled: true, understood: `if ${obj.label} exists, ${inner.understood}` };
  }

  if (/(pick|grab|take|place|put|drop)/.test(text)) {
    const graspable = objects.filter(isGraspable);
    let obj = findByWords(graspable, text);
    if (!obj && /cube/.test(text)) obj = cubes[0];
    if (!obj && /cylinder/.test(text)) obj = objects.find((o) => /cylinder/.test(o.label));

    const wantsPlace = /(place|put|drop|into|onto|on the|in the|to the)/.test(text);
    let dest = null;
    let destLabel = 'table';
    if (/blue zone|zone/.test(text) && blueZone) {
      dest = [blueZone.position[0], blueZone.position[1], 20];
      destLabel = blueZone.label;
    } else if (/left bin/.test(text) && left) {
      dest = [left.position[0], left.position[1], 28];
      destLabel = left.label;
    } else if (/right bin/.test(text) && right) {
      dest = [right.position[0], right.position[1], 28];
      destLabel = right.label;
    } else if (/bin/.test(text)) {
      const bin = findByWords(objects.filter((o) => /bin/.test(o.label)), text) || objects.find((o) => o.label === 'blue_bin');
      if (bin) {
        dest = [bin.position[0], bin.position[1], 28];
        destLabel = bin.label;
      }
    } else if (/table|ground/.test(text)) {
      dest = obj ? [obj.position[0], obj.position[1], 20] : [140, -50, 20];
      destLabel = 'table';
    } else if (wantsPlace) {
      const other = findByWords(objects.filter((o) => !obj || o.id !== obj.id), text);
      if (other && /zone|bin/.test(other.label)) {
        dest = [other.position[0], other.position[1], /zone/.test(other.label) ? 20 : 28];
        destLabel = other.label;
      }
    }

    if (!obj) {
      push(wantsPlace ? 'pick_and_place' : 'pick', null, {}, {
        code: 'UNKNOWN_OBJECT',
        message: 'I could not find that object on the table.',
        suggestion: 'Use a label that exists: red cube, blue cube, yellow cube, or green cylinder.'
      });
      return { handled: true, understood: 'pick — unknown object' };
    }

    const graspIssue = sizeIssue(0, obj) || payloadIssue(0, obj) || reachIssue(0, obj.position, obj.label);
    if (!wantsPlace || !dest) {
      push('pick', obj.label, { objectId: obj.id, from: obj.position }, graspIssue);
      return { handled: true, understood: `pick ${obj.label}` };
    }
    const placeIssue = graspIssue || reachIssue(0, dest, destLabel);
    push('pick_and_place', obj.label, { objectId: obj.id, from: obj.position, to: dest, destLabel }, placeIssue);
    return { handled: true, understood: `pick ${obj.label} and place it on ${destLabel}` };
  }

  if (/(move|jog).*(joint)|set joint/.test(text)) {
    push('move_joints', 'arm', { joints: [20, 30, -25, 0, 15, 0] });
    return { handled: true, understood: 'move joints' };
  }

  const supported = 'home, move_to, move_joints, open_gripper, close_gripper, pick, place, push, pull, stack, unstack, sort, arrange, rotate_object, hand_over, press, wave, wait, repeat, conditional';
  push('unsupported_action', null, { text }, {
    code: 'UNSUPPORTED_ACTION',
    message: `I cannot execute "${text}" because it is not a registered robotic skill.`,
    suggestion: `Closest supported skills: ${supported}.`
  });
  return { handled: true, understood: `unsupported action: ${text}` };
}

function motion(action, agent, name, target, params) {
  return {
    id: `step-${action.id}-${name}`,
    actionId: action.id,
    agent,
    action: name,
    target,
    params: { ...params, actionId: action.id },
    status: action.status === 'failed' ? 'failed' : 'pending',
    reason: action.reason
  };
}

/** Expand each primitive into joint-space / Cartesian steps the arm executor already plays. */
export function planToTaskSteps(plan) {
  if (!plan) return [];
  const steps = [];
  for (const action of plan.actions) {
    if (action.status === 'failed') {
      steps.push(motion(action, 'SafetyAgent', 'BLOCKED', action.target, {
        blocked: true,
        code: plan.feasibility.issues.find((i) => i.action_id === action.id)?.code,
        suggestion: plan.feasibility.issues.find((i) => i.action_id === action.id)?.suggestion,
        reason: action.reason
      }));
      continue;
    }
    const p = action.params || {};
    if (action.type === 'home') {
      steps.push(motion(action, 'KinematicsAgent', 'HOME_JOINTS', 'home', { joints: p.joints || HOME }));
    } else if (action.type === 'move_to' || action.type === 'point' || action.type === 'press') {
      const z = action.type === 'press' ? p.z : p.z;
      if (action.type !== 'move_to') {
        steps.push(motion(action, 'KinematicsAgent', 'MOVE_TO_POSE', action.target, { x: p.x, y: p.y, z: (p.z || 20) + 80 }));
      }
      steps.push(motion(action, 'KinematicsAgent', 'MOVE_TO_POSE', action.target, { x: p.x, y: p.y, z }));
    } else if (action.type === 'move_joints') {
      const seq = Array.isArray(p.joints?.[0]) ? p.joints : [p.joints];
      seq.forEach((joints, i) => {
        steps.push(motion(action, 'KinematicsAgent', 'MOVE_JOINTS', `joints_${i}`, { joints }));
      });
    } else if (action.type === 'wave') {
      (p.joints || []).forEach((joints, i) => {
        steps.push(motion(action, 'KinematicsAgent', 'MOVE_JOINTS', `wave_${i}`, { joints }));
      });
    } else if (action.type === 'open_gripper') {
      steps.push(motion(action, 'GripperAgent', 'RELEASE', 'gripper', {}));
    } else if (action.type === 'close_gripper') {
      steps.push(motion(action, 'GripperAgent', 'GRASP', 'gripper', {}));
    } else if (action.type === 'wait' || action.type === 'conditional') {
      steps.push(motion(action, 'SafetyAgent', 'WAIT', action.target || 'clock', { ms: p.ms || 400, estop: p.estop }));
    } else if (action.type === 'pick' || action.type === 'pick_and_place' || action.type === 'rotate_object' || action.type === 'hand_over' || action.type === 'arrange' || action.type === 'unstack') {
      const from = p.from || [140, -50, 20];
      steps.push(motion(action, 'KinematicsAgent', 'APPROACH_OBJECT', action.target, { x: from[0], y: from[1], z: from[2] + 70 }));
      steps.push(motion(action, 'KinematicsAgent', 'MOVE_TO_POSE', action.target, { x: from[0], y: from[1], z: from[2] + 12 }));
      steps.push(motion(action, 'GripperAgent', 'GRASP', action.target, { objectId: p.objectId }));
      steps.push(motion(action, 'KinematicsAgent', 'LIFT_OBJECT', action.target, { x: from[0], y: from[1], z: from[2] + 100 }));
      if (action.type === 'rotate_object') {
        steps.push(motion(action, 'KinematicsAgent', 'MOVE_JOINTS', action.target, { joints: [0, 35, -40, 0, p.degrees || 90, 0], relativeWrist: true }));
      }
      const to = action.type === 'pick'
        ? null
        : action.type === 'hand_over'
          ? p.to
          : action.type === 'unstack'
            ? [from[0] + 70, from[1], 20]
            : p.to;
      if (to) {
        steps.push(motion(action, 'KinematicsAgent', 'MOVE_TO_POSE', action.target, { x: to[0], y: to[1], z: to[2] + 80 }));
        steps.push(motion(action, 'KinematicsAgent', 'LOWER_TO_TARGET', action.target, { x: to[0], y: to[1], z: to[2] }));
        steps.push(motion(action, 'GripperAgent', 'RELEASE', action.target, { dropPosition: [to[0], to[1], to[2]], objectId: p.objectId, settle: true }));
        steps.push(motion(action, 'KinematicsAgent', 'MOVE_TO_POSE', 'retreat', { x: to[0], y: to[1], z: to[2] + 90 }));
      }
    } else if (action.type === 'push' || action.type === 'pull') {
      const from = p.from;
      const to = p.to;
      const behindSign = action.type === 'pull' ? 1 : -1;
      const axis = p.axis || 'y';
      const behind = axis === 'x'
        ? [from[0] + behindSign * (p.sign || 1) * 40, from[1], Math.max(from[2], 30)]
        : [from[0], from[1] + behindSign * (p.sign || 1) * 40, Math.max(from[2], 30)];
      const end = axis === 'x'
        ? [to[0], to[1], Math.max(from[2], 30)]
        : [to[0], to[1], Math.max(from[2], 30)];
      steps.push(motion(action, 'KinematicsAgent', 'MOVE_TO_POSE', action.target, { x: behind[0], y: behind[1], z: behind[2] + 40 }));
      steps.push(motion(action, 'KinematicsAgent', 'MOVE_BEHIND_OBJECT', action.target, { x: behind[0], y: behind[1], z: behind[2] }));
      steps.push(motion(action, 'KinematicsAgent', 'PUSH_OBJECT_FORWARD', action.target, {
        x: end[0], y: end[1], z: end[2], distance: p.distance, axis, sign: action.type === 'pull' ? -1 : (p.sign || 1), objectId: p.objectId
      }));
      steps.push(motion(action, 'KinematicsAgent', 'MOVE_TO_POSE', 'retreat', { x: end[0], y: end[1], z: end[2] + 70 }));
    } else {
      steps.push(motion(action, 'SafetyAgent', 'BLOCKED', action.target, {
        blocked: true,
        code: 'UNSUPPORTED_ACTION',
        reason: `No executor for ${action.type}.`,
        suggestion: 'Use one of the registered skills: pick, place, push, stack, sort, wave, home, move_to.'
      }));
    }
  }
  return steps;
}

export function validatePlan(plan) {
  if (!plan || !Array.isArray(plan.actions)) {
    return { ok: false, issues: [{ action_id: null, code: 'UNSUPPORTED_ACTION', message: 'Plan has no actions.', suggestion: 'Submit raw_text to /api/commands.' }] };
  }
  return plan.feasibility || { ok: true, issues: [] };
}
