import * as React from 'react';
import { SafeAreaView, View, FlatList, StyleSheet } from 'react-native';
import { Appbar, Menu, Text, FAB, ActivityIndicator, Snackbar } from 'react-native-paper';
import { useAuth } from '../context/AuthContext';
import { useTasks, Task } from '../context/TaskContext';
import TaskForm from '../components/TaskForm';
import TaskItem from '../components/TaskItem';

export default function Root() {
    const { user, loading: authLoading, logout } = useAuth();
    const tasksCtx = useTasks();
    const [formVisible, setFormVisible] = React.useState(false);
    const [editing, setEditing] = React.useState<Task | null>(null);
    const [menuOpen, setMenuOpen] = React.useState(false);
    const [snack, setSnack] = React.useState<string | null>(null);

    React.useEffect(() => {
        if (tasksCtx.state.loading) return;
    }, [tasksCtx.state.loading]);

    if (authLoading) {
        return (
            <SafeAreaView style={styles.center}>
                <ActivityIndicator animating />
            </SafeAreaView>
        );
    }

    if (!user) {
        const AuthScreen = require('./AuthScreen').default;
        return <AuthScreen />;
    }

    function filtered() {
        let arr = [...tasksCtx.state.tasks];
        if (tasksCtx.state.filterPriority !== 'all') arr = arr.filter(t => t.priority === tasksCtx.state.filterPriority);
        if (tasksCtx.state.filterStatus === 'completed') arr = arr.filter(t => t.completed);
        if (tasksCtx.state.filterStatus === 'incomplete') arr = arr.filter(t => !t.completed);
        arr.sort((a, b) => {
            const ta = new Date(a.dueDate).getTime() || 0;
            const tb = new Date(b.dueDate).getTime() || 0;
            return ta - tb;
        });
        return arr;
    }

    async function onSaveTask(data: { title: string; description: string; dueDate: string; priority: Task['priority']; id?: string }) {
        try {
            if (data.id) {
                await tasksCtx.updateTask(data.id, { title: data.title, description: data.description, dueDate: data.dueDate, priority: data.priority });
                setSnack('Task updated');
            } else {
                await tasksCtx.createTask({ title: data.title, description: data.description, dueDate: data.dueDate, priority: data.priority });
                setSnack('Task created');
            }
        } catch (e: any) {
            setSnack(e?.message ?? 'Failed');
        }
    }

    async function onDelete(id: string) {
        try {
            await tasksCtx.deleteTask(id);
            setSnack('Deleted');
        } catch (e: any) {
            setSnack(e?.message ?? 'Delete failed');
        }
    }

    async function onToggle(id: string, completed: boolean) {
        try {
            await tasksCtx.updateTask(id, { completed });
        } catch (e: any) {
            setSnack(e?.message ?? 'Update failed');
        }
    }

    // stable anchor: memoized so its identity doesn't change on parent re-renders
    const filterAnchor = React.useMemo(
        () => <Appbar.Action icon="filter" onPress={() => setMenuOpen(true)} />,
        []
    );

    return (
        <SafeAreaView style={{ flex: 1 }}>
            <Appbar.Header>
                <Appbar.Content title="Gig Tasks" subtitle={user?.email ?? ''} />
                <Menu
                    visible={menuOpen}
                    onDismiss={() => setMenuOpen(false)}
                    anchor={filterAnchor}
                >
                    <Menu.Item title="Priority: All" onPress={() => { tasksCtx.setFilterPriority('all'); setMenuOpen(false); }} />
                    <Menu.Item title="Priority: Low" onPress={() => { tasksCtx.setFilterPriority('low'); setMenuOpen(false); }} />
                    <Menu.Item title="Priority: Medium" onPress={() => { tasksCtx.setFilterPriority('medium'); setMenuOpen(false); }} />
                    <Menu.Item title="Priority: High" onPress={() => { tasksCtx.setFilterPriority('high'); setMenuOpen(false); }} />
                    <Menu.Item title="Status: All" onPress={() => { tasksCtx.setFilterStatus('all'); setMenuOpen(false); }} />
                    <Menu.Item title="Status: Completed" onPress={() => { tasksCtx.setFilterStatus('completed'); setMenuOpen(false); }} />
                    <Menu.Item title="Status: Incomplete" onPress={() => { tasksCtx.setFilterStatus('incomplete'); setMenuOpen(false); }} />
                </Menu>

                <Appbar.Action icon="logout" onPress={() => logout().catch(e => setSnack(e.message || 'Logout failed'))} />
            </Appbar.Header>

            <View style={styles.container}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                    <Text>Priority: {tasksCtx.state.filterPriority}</Text>
                    <Text>Status: {tasksCtx.state.filterStatus}</Text>
                </View>

                {tasksCtx.state.loading ? (
                    <View style={styles.center}><ActivityIndicator animating /></View>
                ) : (
                    <FlatList
                        data={filtered()}
                        keyExtractor={item => item.id}
                        renderItem={({ item }) => (
                            <TaskItem task={item} onEdit={t => { setEditing(t); setFormVisible(true); }} onDelete={onDelete} onToggle={onToggle} />
                        )}
                        ListEmptyComponent={<View style={{ padding: 32, alignItems: 'center' }}><Text>No tasks</Text></View>}
                    />
                )}

                <TaskForm
                    visible={formVisible}
                    initial={editing ?? undefined}
                    onClose={() => { setFormVisible(false); setEditing(null); }}
                    onSave={async data => { await onSaveTask(data); setFormVisible(false); setEditing(null); }}
                />

                <FAB style={styles.fab} icon="plus" onPress={() => setFormVisible(true)} />

                <Snackbar visible={!!snack} onDismiss={() => setSnack(null)} duration={2500}>{snack}</Snackbar>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { padding: 12, flex: 1 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    fab: { position: 'absolute', right: 16, bottom: 24 }
});
