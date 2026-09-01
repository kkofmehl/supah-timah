import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  createId,
  isPhase,
  type Phase,
  type PhaseType,
  type RepeatBlock,
  type Timer,
  type TimerNode,
} from '@supah-timah/shared';
import { getTimer, updateTimer } from '../lib/api';
import { calculateTotalDurationAccurate } from '../lib/timerEngine';
import { DurationStepper, formatDurationLabel } from '../components/DurationStepper';
import { ColorPicker } from '../components/ColorPicker';
import { SoundSettingsEditor } from '../components/SoundSettingsEditor';

const PHASE_TYPES: { value: PhaseType; label: string }[] = [
  { value: 'get_ready', label: 'Get Ready' },
  { value: 'warmup', label: 'Warmup' },
  { value: 'work', label: 'Work' },
  { value: 'rest', label: 'Rest' },
  { value: 'switch', label: 'Switch' },
  { value: 'cooldown', label: 'Cooldown' },
];

const PHASE_TYPE_LABELS = Object.fromEntries(
  PHASE_TYPES.map((t) => [t.value, t.label]),
) as Record<PhaseType, string>;

function cloneTimerNode(node: TimerNode): TimerNode {
  if (isPhase(node)) {
    return { ...node, id: createId() };
  }
  return {
    ...node,
    id: createId(),
    children: node.children.map(cloneTimerNode),
  };
}

function createDefaultPhase(): Phase {
  return {
    kind: 'phase',
    id: createId(),
    type: 'work',
    label: 'Work',
    durationSeconds: 30,
    color: '#E74C3C',
    halfwayNotification: false,
  };
}

function createDefaultRepeat(): RepeatBlock {
  return {
    kind: 'repeat',
    id: createId(),
    label: 'Round',
    repeatCount: 3,
    children: [createDefaultPhase()],
  };
}

interface SortableItemProps {
  id: string;
  children: React.ReactNode;
}

function SortableItem({ id, children }: SortableItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className="bg-white/5 rounded-xl p-4 space-y-3"
    >
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="text-gray-500 cursor-grab active:cursor-grabbing px-1"
          {...attributes}
          {...listeners}
        >
          ⠿
        </button>
        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
}

interface PhaseEditorProps {
  phase: Phase;
  onChange: (phase: Phase) => void;
  onDelete: () => void;
  onDuplicate: () => void;
}

function PhaseEditor({ phase, onChange, onDelete, onDuplicate }: PhaseEditorProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <select
          value={phase.type}
          onChange={(e) => {
            const type = e.target.value as PhaseType;
            onChange({
              ...phase,
              type,
              label: PHASE_TYPE_LABELS[type],
            });
          }}
          className="px-3 py-1 rounded-lg bg-white/10 border border-white/20 text-sm"
        >
          {PHASE_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
        <div className="flex items-center gap-3">
          <button onClick={onDuplicate} className="text-indigo-400 text-sm">
            Duplicate
          </button>
          <button onClick={onDelete} className="text-red-400 text-sm">
            Remove
          </button>
        </div>
      </div>

      <input
        value={phase.label}
        onChange={(e) => onChange({ ...phase, label: e.target.value })}
        placeholder="Label"
        className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20"
      />

      <DurationStepper
        valueSeconds={phase.durationSeconds}
        onChange={(s) => onChange({ ...phase, durationSeconds: s })}
      />

      <ColorPicker
        value={phase.color}
        onChange={(color) => onChange({ ...phase, color })}
      />

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={phase.halfwayNotification}
          onChange={(e) =>
            onChange({ ...phase, halfwayNotification: e.target.checked })
          }
        />
        Halfway notification
      </label>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={!!phase.splitSides?.enabled}
          onChange={(e) =>
            onChange({
              ...phase,
              splitSides: e.target.checked
                ? { enabled: true, switchDurationSeconds: 5 }
                : undefined,
              halfwayNotification: e.target.checked
                ? false
                : phase.halfwayNotification,
            })
          }
        />
        Split L/R
      </label>

      {phase.splitSides?.enabled && (
        <DurationStepper
          label="Switch duration"
          valueSeconds={phase.splitSides.switchDurationSeconds}
          onChange={(s) =>
            onChange({
              ...phase,
              splitSides: { enabled: true, switchDurationSeconds: s },
            })
          }
          step={1}
        />
      )}
    </div>
  );
}

interface RepeatEditorProps {
  block: RepeatBlock;
  onChange: (block: RepeatBlock) => void;
  onDelete: () => void;
  onDuplicate: () => void;
}

function RepeatEditor({ block, onChange, onDelete, onDuplicate }: RepeatEditorProps) {
  const updateChild = (index: number, child: TimerNode) => {
    const children = [...block.children];
    children[index] = child;
    onChange({ ...block, children });
  };

  const deleteChild = (index: number) => {
    onChange({
      ...block,
      children: block.children.filter((_, i) => i !== index),
    });
  };

  const addPhase = () => {
    onChange({ ...block, children: [...block.children, createDefaultPhase()] });
  };

  return (
    <div className="space-y-3 border-l-2 border-indigo-500/50 pl-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-indigo-300">Repeat Block</span>
        <div className="flex items-center gap-3">
          <button onClick={onDuplicate} className="text-indigo-400 text-sm">
            Duplicate
          </button>
          <button onClick={onDelete} className="text-red-400 text-sm">
            Remove
          </button>
        </div>
      </div>

      <input
        value={block.label}
        onChange={(e) => onChange({ ...block, label: e.target.value })}
        placeholder="Block label"
        className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20"
      />

      <div>
        <label className="text-sm text-gray-400">Repeat count</label>
        <input
          type="number"
          min={1}
          value={block.repeatCount}
          onChange={(e) =>
            onChange({ ...block, repeatCount: Number(e.target.value) })
          }
          className="w-full mt-1 px-3 py-2 rounded-lg bg-white/10 border border-white/20"
        />
      </div>

      <DurationStepper
        label="Rest between repeats"
        valueSeconds={block.restBetweenRepeatsSeconds ?? 0}
        onChange={(s) =>
          onChange({
            ...block,
            restBetweenRepeatsSeconds: s > 0 ? s : undefined,
          })
        }
      />

      <div className="space-y-2 pl-2">
        {block.children.map((child, i) =>
          isPhase(child) ? (
            <PhaseEditor
              key={child.id}
              phase={child}
              onChange={(p) => updateChild(i, p)}
              onDelete={() => deleteChild(i)}
              onDuplicate={() =>
                onChange({
                  ...block,
                  children: [
                    ...block.children.slice(0, i + 1),
                    cloneTimerNode(child),
                    ...block.children.slice(i + 1),
                  ],
                })
              }
            />
          ) : (
            <RepeatEditor
              key={child.id}
              block={child}
              onChange={(b) => updateChild(i, b)}
              onDelete={() => deleteChild(i)}
              onDuplicate={() =>
                onChange({
                  ...block,
                  children: [
                    ...block.children.slice(0, i + 1),
                    cloneTimerNode(child),
                    ...block.children.slice(i + 1),
                  ],
                })
              }
            />
          ),
        )}
        <button onClick={addPhase} className="text-sm text-indigo-400">
          + Add phase
        </button>
      </div>
    </div>
  );
}

interface NodeEditorProps {
  node: TimerNode;
  onChange: (node: TimerNode) => void;
  onDelete: () => void;
  onDuplicate: () => void;
}

function NodeEditor({ node, onChange, onDelete, onDuplicate }: NodeEditorProps) {
  if (isPhase(node)) {
    return (
      <PhaseEditor
        phase={node}
        onChange={onChange}
        onDelete={onDelete}
        onDuplicate={onDuplicate}
      />
    );
  }
  return (
    <RepeatEditor
      block={node}
      onChange={onChange}
      onDelete={onDelete}
      onDuplicate={onDuplicate}
    />
  );
}

export function EditTimerPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [timer, setTimer] = useState<Timer | null>(null);
  const [saving, setSaving] = useState(false);
  const [showSounds, setShowSounds] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  useEffect(() => {
    if (!id) return;
    getTimer(id).then(setTimer);
  }, [id]);

  useEffect(() => {
    if (timer) document.title = `Edit ${timer.name} — Supah Timah`;
  }, [timer]);

  const updateNodes = useCallback((nodes: TimerNode[]) => {
    setTimer((t) => (t ? { ...t, nodes } : t));
  }, []);

  const handleDragEnd = (event: DragEndEvent) => {
    if (!timer) return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = timer.nodes.findIndex((n) => n.id === active.id);
    const newIndex = timer.nodes.findIndex((n) => n.id === over.id);
    updateNodes(arrayMove(timer.nodes, oldIndex, newIndex));
  };

  const handleSave = async () => {
    if (!timer) return;
    setSaving(true);
    const updated = {
      ...timer,
      updatedAt: new Date().toISOString(),
    };
    await updateTimer(updated);
    setSaving(false);
    navigate('/');
  };

  if (!timer) {
    return <p className="p-4 text-gray-400">Loading…</p>;
  }

  const totalSeconds = calculateTotalDurationAccurate(timer.nodes);

  return (
    <div className="min-h-full pb-28">
      <header className="p-4 border-b border-white/10 space-y-3">
        <button
          onClick={() => navigate('/')}
          className="text-gray-400 text-sm"
        >
          ← Back
        </button>
        <input
          value={timer.name}
          onChange={(e) => setTimer({ ...timer, name: e.target.value })}
          className="w-full text-2xl font-bold bg-transparent focus:outline-none"
        />
        <p className="text-sm text-gray-400">
          Total: {formatDurationLabel(totalSeconds)}
        </p>
        <Link
          to={`/run/${timer.id}`}
          className="inline-block px-4 py-2 rounded-lg bg-green-600 text-sm font-medium"
        >
          Run Timer
        </Link>
      </header>

      <div className="p-4 space-y-4">
        <button
          onClick={() => setShowSounds(!showSounds)}
          className="text-sm text-indigo-400"
        >
          {showSounds ? 'Hide' : 'Show'} sound settings
        </button>
        {showSounds && (
          <SoundSettingsEditor
            settings={timer.globalSounds}
            onChange={(globalSounds) => setTimer({ ...timer, globalSounds })}
          />
        )}

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={timer.nodes.map((n) => n.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-3">
              {timer.nodes.map((node, i) => (
                <SortableItem key={node.id} id={node.id}>
                  <NodeEditor
                    node={node}
                    onChange={(updated) => {
                      const nodes = [...timer.nodes];
                      nodes[i] = updated;
                      updateNodes(nodes);
                    }}
                    onDelete={() =>
                      updateNodes(timer.nodes.filter((_, j) => j !== i))
                    }
                    onDuplicate={() => {
                      const nodes = [...timer.nodes];
                      nodes.splice(i + 1, 0, cloneTimerNode(node));
                      updateNodes(nodes);
                    }}
                  />
                </SortableItem>
              ))}
            </div>
          </SortableContext>
        </DndContext>

        <div className="flex gap-2">
          <button
            onClick={() => updateNodes([...timer.nodes, createDefaultPhase()])}
            className="flex-1 py-2 rounded-lg bg-white/10 text-sm"
          >
            + Phase
          </button>
          <button
            onClick={() => updateNodes([...timer.nodes, createDefaultRepeat()])}
            className="flex-1 py-2 rounded-lg bg-white/10 text-sm"
          >
            + Repeat Block
          </button>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-[#1a1a2e] border-t border-white/10">
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-3 rounded-xl bg-indigo-600 font-semibold text-lg disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save Timer'}
        </button>
      </div>
    </div>
  );
}
