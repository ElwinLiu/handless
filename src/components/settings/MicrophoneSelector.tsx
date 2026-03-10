import React, { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ArrowsDownUp, MicrophoneSlash, X } from "@phosphor-icons/react";
import { SettingContainer } from "../ui/SettingContainer";
import { useSettings } from "../../hooks/useSettings";

interface SortableItemProps {
  id: string;
  name: string;
  isAvailable: boolean;
  isActive: boolean;
  onRemove?: () => void;
}

const SortableItem: React.FC<SortableItemProps> = ({
  id,
  name,
  isAvailable,
  isActive,
  onRemove,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 px-2 py-1 rounded border text-sm select-none ${
        isDragging
          ? "border-accent bg-accent/10 shadow-md z-10"
          : "border-muted/40 bg-muted/5"
      } ${!isAvailable ? "opacity-50" : ""}`}
    >
      <button
        type="button"
        className="cursor-grab active:cursor-grabbing text-muted hover:text-foreground shrink-0"
        {...attributes}
        {...listeners}
      >
        <ArrowsDownUp className="w-3.5 h-3.5" />
      </button>
      <span className="truncate flex-1">{name}</span>
      {isActive && (
        <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
      )}
      {!isAvailable && (
        <>
          <MicrophoneSlash className="w-3.5 h-3.5 text-muted shrink-0" />
          {onRemove && (
            <button
              type="button"
              onClick={onRemove}
              className="text-muted hover:text-foreground shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </>
      )}
    </div>
  );
};

interface MicrophoneSelectorProps {
  descriptionMode?: "inline" | "tooltip";
  grouped?: boolean;
}

export const MicrophoneSelector: React.FC<MicrophoneSelectorProps> = React.memo(
  ({ descriptionMode = "tooltip", grouped = false }) => {
    const { t } = useTranslation();
    const {
      getSetting,
      updateSetting,
      isUpdating,
      isLoading,
      audioDevices,
      effectiveMicrophone,
    } = useSettings();

    const sensors = useSensors(
      useSensor(PointerSensor),
      useSensor(KeyboardSensor, {
        coordinateGetter: sortableKeyboardCoordinates,
      }),
    );

    const rawPriority = getSetting("microphone_priority");
    const priority: string[] = useMemo(() => rawPriority ?? [], [rawPriority]);

    const availableDeviceNames = useMemo(
      () => new Set(audioDevices.map((d) => d.name)),
      [audioDevices],
    );

    // Build the ordered list: priority items first, then any new devices not yet in priority
    const orderedItems = useMemo(() => {
      const items: { id: string; name: string; isAvailable: boolean }[] = [];
      const seen = new Set<string>();

      // Priority items in order
      for (const name of priority) {
        items.push({
          id: name,
          name,
          isAvailable: availableDeviceNames.has(name),
        });
        seen.add(name);
      }

      // Append any available devices not in priority yet
      for (const device of audioDevices) {
        if (!seen.has(device.name)) {
          items.push({
            id: device.name,
            name: device.name,
            isAvailable: true,
          });
        }
      }

      return items;
    }, [priority, audioDevices, availableDeviceNames]);

    const handleRemove = useCallback(
      (name: string) => {
        const newPriority = priority.filter((n) => n !== name);
        updateSetting("microphone_priority", newPriority);
      },
      [priority, updateSetting],
    );

    const handleDragEnd = useCallback(
      (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const oldIndex = orderedItems.findIndex(
          (item) => item.id === active.id,
        );
        const newIndex = orderedItems.findIndex((item) => item.id === over.id);
        if (oldIndex === -1 || newIndex === -1) return;

        const newOrder = [...orderedItems.map((item) => item.name)];
        const [removed] = newOrder.splice(oldIndex, 1);
        newOrder.splice(newIndex, 0, removed!);

        updateSetting("microphone_priority", newOrder);
      },
      [orderedItems, updateSetting],
    );

    const disabled = isUpdating("microphone_priority") || isLoading;

    return (
      <SettingContainer
        title={t("settings.sound.microphone.title")}
        description={t("settings.sound.microphone.description")}
        descriptionMode={descriptionMode}
        grouped={grouped}
        layout="stacked"
      >
        <div className="space-y-1">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={orderedItems.map((item) => item.id)}
              strategy={verticalListSortingStrategy}
              disabled={disabled}
            >
              {orderedItems.length === 0 ? (
                <div className="text-sm text-muted py-1">
                  {isLoading
                    ? t("settings.sound.microphone.loading")
                    : t("settings.sound.microphone.placeholder")}
                </div>
              ) : (
                orderedItems.map((item) => (
                  <SortableItem
                    key={item.id}
                    id={item.id}
                    name={item.name}
                    isAvailable={item.isAvailable}
                    isActive={item.name === effectiveMicrophone}
                    onRemove={
                      !item.isAvailable
                        ? () => handleRemove(item.name)
                        : undefined
                    }
                  />
                ))
              )}
            </SortableContext>
          </DndContext>
        </div>
      </SettingContainer>
    );
  },
);

MicrophoneSelector.displayName = "MicrophoneSelector";
