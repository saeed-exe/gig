import * as React from 'react';
import { Card, Paragraph, IconButton, Checkbox, ActivityIndicator } from 'react-native-paper';
import { View, StyleSheet, Animated } from 'react-native';
import { Task } from '../context/TaskContext';

type Props = {
    task: Task;
    onEdit: (t: Task) => void;
    onDelete: (id: string) => void;
    onToggle: (id: string, completed: boolean) => void;
};

export default function TaskItem({ task, onEdit, onDelete, onToggle }: Props) {
    const fade = React.useRef(new Animated.Value(0)).current;
    React.useEffect(() => {
        Animated.timing(fade, { toValue: 1, duration: 300, useNativeDriver: true }).start();
    }, []);

    const isLocal = task.id.startsWith('local-');

    return (
        <Animated.View style={{ opacity: fade }}>
            <Card style={styles.card}>
                <Card.Title
                    title={task.title}
                    subtitle={`${task.dueDate} • ${task.priority.toUpperCase()}`}
                    left={() =>
                        isLocal ? (
                            <ActivityIndicator style={{ marginLeft: 8 }} size={20} animating />
                        ) : (
                            <Checkbox status={task.completed ? 'checked' : 'unchecked'} onPress={() => onToggle(task.id, !task.completed)} />
                        )
                    }
                    right={() =>
                        isLocal ? (
                            <View style={{ flexDirection: 'row', alignItems: 'center', paddingRight: 8 }}>
                                <ActivityIndicator size={18} />
                            </View>
                        ) : (
                            <View style={{ flexDirection: 'row' }}>
                                <IconButton icon="pencil" onPress={() => onEdit(task)} />
                                <IconButton icon="delete" onPress={() => onDelete(task.id)} />
                            </View>
                        )
                    }
                />
                {task.description ? <Card.Content><Paragraph>{task.description}</Paragraph></Card.Content> : null}
            </Card>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    card: { marginBottom: 8 }
});
