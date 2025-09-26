import * as React from 'react';
import { SafeAreaView, View, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { Appbar, TextInput, Button, Text, ActivityIndicator, Snackbar } from 'react-native-paper';
import { useAuth } from '../context/AuthContext';

export default function AuthScreen() {
    const { register, login, loading, error } = useAuth();
    const [mode, setMode] = React.useState<'login' | 'register'>('login');
    const [email, setEmail] = React.useState('');
    const [password, setPassword] = React.useState('');
    const [busy, setBusy] = React.useState(false);
    const [snack, setSnack] = React.useState<string | null>(null);

    React.useEffect(() => {
        if (error) setSnack(error);
    }, [error]);

    async function onSubmit() {
        if (!email || !password) {
            setSnack('Provide email and password');
            return;
        }
        setBusy(true);
        try {
            if (mode === 'login') await login(email.trim(), password);
            else await register(email.trim(), password);
        } catch (e: any) {
            setSnack(e?.message ?? 'Action failed');
        } finally {
            setBusy(false);
        }
    }

    return (
        <SafeAreaView style={{ flex: 1 }}>
            <Appbar.Header>
                <Appbar.Content title="Gig Tasks" />
            </Appbar.Header>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
                <View style={styles.box}>
                    <TextInput label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" style={styles.input} />
                    <TextInput label="Password" value={password} onChangeText={setPassword} secureTextEntry style={styles.input} />
                    <Button mode="contained" onPress={onSubmit} disabled={busy} style={{ marginTop: 8 }}>
                        {busy ? <ActivityIndicator animating /> : mode === 'login' ? 'Login' : 'Register'}
                    </Button>
                    <Button onPress={() => setMode(m => (m === 'login' ? 'register' : 'login'))} style={{ marginTop: 8 }}>
                        {mode === 'login' ? 'Create an account' : 'Have an account? Login'}
                    </Button>
                </View>
                <Snackbar visible={!!snack} onDismiss={() => setSnack(null)} duration={3000}>{snack}</Snackbar>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: 'center', paddingHorizontal: 16 },
    box: { backgroundColor: 'white', padding: 16, borderRadius: 8, elevation: 2 },
    input: { marginVertical: 6 }
});
