import * as React from 'react';
import { Portal, Modal, TextInput, Button, Chip } from 'react-native-paper';
import { KeyboardAvoidingView, Platform, View, StyleSheet } from 'react-native';
import { Task } from '../context/TaskContext';

type Props = {
    visible: boolean;
    initial?: Partial<Task>;
    onClose: () => void;
    onSave: (data: { title: string; description: string; dueDate: string; priority: Task['priority']; id?: string }) => void;
};

export default function TaskForm({ visible, initial, onClose, onSave }: Props) {
    const [title, setTitle] = React.useState(initial?.title ?? '');
    const [description, setDescription] = React.useState(initial?.description ?? '');
    const [dueDate, setDueDate] = React.useState(initial?.dueDate ?? '');
    const [priority, setPriority] = React.useState<Task['priority']>(initial?.priority ?? 'medium');

    React.useEffect(() => {
        if (visible) {
            setTitle(initial?.title ?? '');
            setDescription(initial?.description ?? '');
            setDueDate(initial?.dueDate ?? '');
            setPriority(initial?.priority ?? 'medium');
        }
    }, [visible, initial]);

    function submit() {
        if (!title.trim() || !dueDate.trim()) return;
        onSave({ title: title.trim(), description: description.trim(), dueDate: dueDate.trim(), priority, id: initial?.id });
    }

    return (
        <Portal>
            <Modal visible={visible} onDismiss={onClose} contentContainerStyle={styles.container}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                    <TextInput label="Title" value={title} onChangeText={setTitle} style={styles.input} />
                    <TextInput label="Description" value={description} onChangeText={setDescription} style={styles.input} multiline />
                    <TextInput label="Due date (YYYY-MM-DD)" value={dueDate} onChangeText={setDueDate} style={styles.input} placeholder="2025-12-31" />
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginVertical: 8 }}>
                        <Chip mode="outlined" selected={priority === 'low'} onPress={() => setPriority('low')}>Low</Chip>
                        <Chip mode="outlined" selected={priority === 'medium'} onPress={() => setPriority('medium')}>Medium</Chip>
                        <Chip mode="outlined" selected={priority === 'high'} onPress={() => setPriority('high')}>High</Chip>
                    </View>
                    <Button mode="contained" onPress={submit} style={{ marginTop: 8 }}>Save</Button>
                    <Button onPress={onClose} style={{ marginTop: 8 }}>Cancel</Button>
                </KeyboardAvoidingView>
            </Modal>
        </Portal>
    );
}

const styles = StyleSheet.create({
    container: { backgroundColor: 'white', margin: 20, padding: 16, borderRadius: 8 },
    input: { marginVertical: 6 }
});
