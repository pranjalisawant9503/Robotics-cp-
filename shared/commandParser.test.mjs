import { parseCommand, planToTaskSteps, DEFAULT_SCENE_OBJECTS } from './commandParser.mjs';

const cases = [
  {
    name: 'pick red cube onto blue zone',
    text: 'pick up the red cube and place it on the blue zone',
    expect(plan) {
      assert(plan.feasibility.ok, 'feasible');
      assert(plan.actions[0].type === 'pick_and_place', 'type');
      assert(plan.actions[0].target === 'red_cube', plan.actions[0].target);
      assert(plan.actions[0].params.destLabel === 'blue_zone', 'dest');
    }
  },
  {
    name: 'stack three cubes',
    text: 'stack the three cubes into one tower',
    expect(plan) {
      assert(plan.feasibility.ok, 'feasible');
      assert(plan.actions.length === 2, `layers ${plan.actions.length}`);
      assert(plan.actions.every((a) => a.type === 'pick_and_place'), 'picks');
    }
  },
  {
    name: 'sort by color',
    text: 'sort the cubes into left and right bins by color',
    expect(plan) {
      assert(plan.feasibility.ok, 'feasible');
      const red = plan.actions.find((a) => a.target === 'red_cube');
      const blue = plan.actions.find((a) => a.target === 'blue_cube');
      assert(red.params.bin === 'left_bin', 'red left');
      assert(blue.params.bin === 'right_bin', 'blue right');
    }
  },
  {
    name: 'cartesian meters',
    text: 'move to x 0.3 y 0.2 z 0.25',
    expect(plan) {
      assert(plan.feasibility.ok, JSON.stringify(plan.feasibility));
      assert(plan.actions[0].type === 'move_to', 'type');
      assert(Math.abs(plan.actions[0].params.x - 300) < 1, 'x');
      assert(Math.abs(plan.actions[0].params.z - 250) < 1, 'z');
    }
  },
  {
    name: 'push 20 cm',
    text: 'push the green cylinder forward 20 cm',
    expect(plan) {
      assert(plan.feasibility.ok, JSON.stringify(plan.feasibility));
      assert(plan.actions[0].type === 'push', 'type');
      assert(plan.actions[0].params.distance === 200, String(plan.actions[0].params.distance));
      assert(plan.actions[0].target === 'green_cylinder', 'target');
    }
  },
  {
    name: 'wave then home',
    text: 'wave hello, then go home',
    expect(plan) {
      assert(plan.feasibility.ok, 'feasible');
      assert(plan.actions[0].type === 'wave', 'wave');
      assert(plan.actions[1].type === 'home', 'home');
      const steps = planToTaskSteps(plan);
      assert(steps.some((s) => s.action === 'HOME_JOINTS'), 'home step');
      assert(steps.filter((s) => s.action === 'MOVE_JOINTS').length >= 4, 'wave joints');
    }
  },
  {
    name: 'repeat 3',
    text: 'pick the blue cube, place it on the table, and repeat 3 times',
    expect(plan) {
      assert(plan.feasibility.ok, JSON.stringify(plan.feasibility));
      assert(plan.actions.length === 3, `count ${plan.actions.length}`);
      assert(plan.actions.every((a) => a.target === 'blue_cube'), 'target');
    }
  },
  {
    name: 'two meters away',
    text: 'pick the cube 2 meters away',
    expect(plan) {
      assert(!plan.feasibility.ok, 'not feasible');
      assert(plan.feasibility.issues[0].code === 'OUT_OF_REACH', plan.feasibility.issues[0].code);
      assert(/nearest reachable/i.test(plan.feasibility.issues[0].suggestion), plan.feasibility.issues[0].suggestion);
      const steps = planToTaskSteps(plan);
      assert(steps[0].params.blocked === true, 'blocked');
    }
  },
  {
    name: 'unsupported action',
    text: 'juggle the three cubes',
    expect(plan) {
      assert(!plan.feasibility.ok, 'not feasible');
      assert(plan.feasibility.issues[0].code === 'UNSUPPORTED_ACTION', plan.feasibility.issues[0].code);
      assert(/closest supported skills/i.test(plan.feasibility.issues[0].suggestion), plan.feasibility.issues[0].suggestion);
      assert(plan.actions[0].type === 'unsupported_action', plan.actions[0].type);
    }
  }
];

let failed = 0;
function assert(cond, msg) {
  if (!cond) throw new Error(msg || 'assertion failed');
}

for (const c of cases) {
  try {
    const { handled, plan } = parseCommand(c.text, DEFAULT_SCENE_OBJECTS);
    assert(handled && plan, 'parser did not handle the command');
    c.expect(plan);
    console.log(`[PASS] ${c.name}`);
  } catch (err) {
    failed += 1;
    console.error(`[FAIL] ${c.name}: ${err.message}`);
  }
}

if (failed) {
  console.error(`${failed} acceptance tests failed`);
  process.exit(1);
}
console.log(`All ${cases.length} acceptance tests passed`);
