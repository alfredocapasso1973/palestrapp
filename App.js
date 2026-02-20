import * as React from "react";
import {
    View,
    Text,
    Pressable,
    FlatList,
    StyleSheet,
    TextInput,
    Keyboard,
    Alert,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

const Stack = createNativeStackNavigator();

const STORAGE_KEY = "palestrapp_groups_v1";
const STEP_KG = 0.5;

const INITIAL_DATA = [
    {
        id: "chest",
        title: "Chest",
        exercises: [
            { id: "db_bench", name: "Dumbbell Bench Press", kg: 11 },
            { id: "pec_deck", name: "Pec Deck (Machine Fly)", kg: 20 },
        ],
    },
    {
        id: "triceps",
        title: "Triceps",
        exercises: [
            { id: "pushdown", name: "Triceps Pushdown (Machine/Cable)", kg: 15 },
            { id: "db_ext", name: "Standing Dumbbell Triceps Extension (Two-Arm)", kg: 12.5 },
        ],
    },
    { id: "back", title: "Back", exercises: [] },
    { id: "legs", title: "Legs", exercises: [] },
    { id: "shoulders", title: "Shoulders", exercises: [] },
    { id: "biceps", title: "Biceps", exercises: [] },
    { id: "core", title: "Core", exercises: [] },
];

function clampKg(value) {
    if (Number.isNaN(value)) return 0;
    const v = Math.max(0, value);
    return Math.round(v * 10) / 10;
}

function makeId() {
    return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function MuscleGroupsScreen({ navigation, groups }) {
    return (
        <View style={styles.container}>
            <FlatList
                data={groups}
                keyExtractor={(item) => item.id}
                ItemSeparatorComponent={() => <View style={styles.sep} />}
                renderItem={({ item }) => (
                    <Pressable
                        style={styles.row}
                        onPress={() => navigation.navigate("Exercises", { groupId: item.id })}
                    >
                        <Text style={styles.rowText}>{item.title}</Text>
                    </Pressable>
                )}
            />
        </View>
    );
}

function ExercisesScreen({ route, groups, setGroups }) {
    const groupId = route.params?.groupId;
    const group = groups.find((g) => g.id === groupId);

    const [showAdd, setShowAdd] = React.useState(false);
    const [newName, setNewName] = React.useState("");
    const [newKg, setNewKg] = React.useState("");

    const updateExerciseKg = React.useCallback(
        (exerciseId, delta) => {
            setGroups((prev) =>
                prev.map((g) => {
                    if (g.id !== groupId) return g;
                    return {
                        ...g,
                        exercises: (g.exercises ?? []).map((e) => {
                            if (e.id !== exerciseId) return e;
                            return { ...e, kg: clampKg((e.kg ?? 0) + delta) };
                        }),
                    };
                })
            );
        },
        [groupId, setGroups]
    );

    const deleteExercise = React.useCallback(
        (exerciseId) => {
            setGroups((prev) =>
                prev.map((g) => {
                    if (g.id !== groupId) return g;
                    return {
                        ...g,
                        exercises: (g.exercises ?? []).filter((e) => e.id !== exerciseId),
                    };
                })
            );
        },
        [groupId, setGroups]
    );

    const confirmDelete = React.useCallback(
        (exercise) => {
            Alert.alert("Delete exercise?", exercise.name, [
                { text: "Cancel", style: "cancel" },
                { text: "Delete", style: "destructive", onPress: () => deleteExercise(exercise.id) },
            ]);
        },
        [deleteExercise]
    );

    const addExercise = React.useCallback(() => {
        const name = newName.trim();
        if (!name) return;

        const kgNum = clampKg(parseFloat(String(newKg).replace(",", ".")) || 0);

        setGroups((prev) =>
            prev.map((g) => {
                if (g.id !== groupId) return g;
                return {
                    ...g,
                    exercises: [...(g.exercises ?? []), { id: makeId(), name, kg: kgNum }],
                };
            })
        );

        setNewName("");
        setNewKg("");
        setShowAdd(false);
        Keyboard.dismiss();
    }, [groupId, newName, newKg, setGroups]);

    const closeAdd = React.useCallback(() => {
        setShowAdd(false);
        Keyboard.dismiss();
    }, []);

    const openAdd = React.useCallback(() => {
        setShowAdd(true);
    }, []);

    return (
        <View style={styles.container}>
            <FlatList
                data={group?.exercises ?? []}
                keyExtractor={(item) => item.id}
                ItemSeparatorComponent={() => <View style={styles.sep} />}
                ListEmptyComponent={<Text style={styles.empty}>No exercises yet.</Text>}
                contentContainerStyle={{ paddingBottom: 120 }}
                renderItem={({ item }) => (
                    <Pressable
                        onLongPress={() => confirmDelete(item)}
                        delayLongPress={350}
                        style={styles.exerciseRow}
                    >
                        <Text style={styles.exerciseName}>{item.name}</Text>

                        <View style={styles.kgControls}>
                            <Pressable style={styles.kgBtn} onPress={() => updateExerciseKg(item.id, -STEP_KG)}>
                                <Text style={styles.kgBtnText}>-</Text>
                            </Pressable>

                            <Text style={styles.exerciseKg}>{item.kg} kg</Text>

                            <Pressable style={styles.kgBtn} onPress={() => updateExerciseKg(item.id, +STEP_KG)}>
                                <Text style={styles.kgBtnText}>+</Text>
                            </Pressable>
                        </View>
                    </Pressable>
                )}
            />

            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : undefined}
                keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
                style={styles.footer}
            >
                {showAdd ? (
                    <View style={styles.addBox}>
                        <TextInput
                            value={newName}
                            onChangeText={setNewName}
                            placeholder="Exercise name (English)"
                            autoCapitalize="words"
                            returnKeyType="done"
                            onSubmitEditing={Keyboard.dismiss}
                            style={styles.input}
                        />
                        <View style={styles.addRow}>
                            <TextInput
                                value={newKg}
                                onChangeText={setNewKg}
                                placeholder="kg"
                                keyboardType="decimal-pad"
                                returnKeyType="done"
                                onSubmitEditing={Keyboard.dismiss}
                                style={[styles.input, styles.kgInput]}
                            />
                            <Pressable style={styles.addBtn} onPress={addExercise}>
                                <Text style={styles.addBtnText}>Add</Text>
                            </Pressable>
                            <Pressable style={styles.cancelBtn} onPress={closeAdd}>
                                <Text style={styles.cancelBtnText}>Close</Text>
                            </Pressable>
                        </View>
                    </View>
                ) : (
                    <Pressable style={styles.primaryFooterBtn} onPress={openAdd}>
                        <Text style={styles.primaryFooterBtnText}>Add exercise</Text>
                    </Pressable>
                )}
            </KeyboardAvoidingView>
        </View>
    );
}

export default function App() {
    const [groups, setGroups] = React.useState(INITIAL_DATA);
    const [loaded, setLoaded] = React.useState(false);

    React.useEffect(() => {
        (async () => {
            try {
                const raw = await AsyncStorage.getItem(STORAGE_KEY);
                if (raw) {
                    const parsed = JSON.parse(raw);
                    if (Array.isArray(parsed)) setGroups(parsed);
                }
            } catch (e) {
                // ignore and fall back to INITIAL_DATA
            } finally {
                setLoaded(true);
            }
        })();
    }, []);

    React.useEffect(() => {
        if (!loaded) return;
        (async () => {
            try {
                await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(groups));
            } catch (e) {
                // ignore
            }
        })();
    }, [groups, loaded]);

    if (!loaded) {
        return (
            <View style={[styles.container, styles.center]}>
                <ActivityIndicator size="large" />
                <Text style={{ marginTop: 12, opacity: 0.7 }}>Loading…</Text>
            </View>
        );
    }

    return (
        <NavigationContainer>
            <Stack.Navigator>
                <Stack.Screen name="Muscle Groups">
                    {(props) => <MuscleGroupsScreen {...props} groups={groups} />}
                </Stack.Screen>

                <Stack.Screen
                    name="Exercises"
                    options={({ route }) => {
                        const groupId = route.params?.groupId;
                        const group = groups.find((g) => g.id === groupId);
                        return { title: group?.title ?? "Exercises" };
                    }}
                >
                    {(props) => <ExercisesScreen {...props} groups={groups} setGroups={setGroups} />}
                </Stack.Screen>
            </Stack.Navigator>
        </NavigationContainer>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 16 },
    center: { alignItems: "center", justifyContent: "center" },
    sep: { height: 12 },

    row: { padding: 16, borderRadius: 12, backgroundColor: "#eee" },
    rowText: { fontSize: 18, fontWeight: "600" },

    exerciseRow: {
        padding: 16,
        borderRadius: 12,
        backgroundColor: "#eee",
        gap: 10,
    },
    exerciseName: { fontSize: 16, fontWeight: "600" },

    kgControls: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
    },
    kgBtn: {
        width: 44,
        height: 36,
        borderRadius: 10,
        backgroundColor: "#ddd",
        alignItems: "center",
        justifyContent: "center",
    },
    kgBtnText: { fontSize: 18, fontWeight: "900" },
    exerciseKg: { fontSize: 16, fontWeight: "800" },

    empty: { marginTop: 8, fontSize: 16, opacity: 0.7 },

    footer: {
        position: "absolute",
        left: 16,
        right: 16,
        bottom: 16,
    },

    primaryFooterBtn: {
        paddingVertical: 14,
        borderRadius: 14,
        backgroundColor: "#111",
        alignItems: "center",
    },
    primaryFooterBtnText: { color: "#fff", fontWeight: "800", fontSize: 16 },

    addBox: { gap: 10 },
    addRow: { flexDirection: "row", gap: 10, alignItems: "center" },

    input: {
        paddingHorizontal: 12,
        paddingVertical: 12,
        borderRadius: 12,
        backgroundColor: "#f3f3f3",
        fontSize: 16,
    },
    kgInput: { width: 90 },

    addBtn: {
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderRadius: 12,
        backgroundColor: "#111",
    },
    addBtnText: { color: "#fff", fontWeight: "800", fontSize: 16 },

    cancelBtn: {
        paddingHorizontal: 12,
        paddingVertical: 12,
        borderRadius: 12,
        backgroundColor: "#ddd",
    },
    cancelBtnText: { fontWeight: "800", fontSize: 16 },
});