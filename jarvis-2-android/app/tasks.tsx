import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Stack, router } from 'expo-router';
import { api } from '../lib/api';

const bg = '#05070a';
const card = '#0c1118';
const line = '#1b2633';

export default function TasksScreen() {
  const [items, setItems] = useState<any[]>([]);
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try { setError(''); setItems((await api.tasks()) as any[]); }
    catch (e) { setError(e instanceof Error ? e.message : 'Błąd API'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function addTask() {
    if (!title.trim()) return;
    try { setSaving(true); await api.createTask(title.trim()); setTitle(''); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Nie udało się utworzyć zadania'); }
    finally { setSaving(false); }
  }

  return <View style={styles.root}>
    <Stack.Screen options={{ headerShown: false }} />
    <View style={styles.header}>
      <Pressable onPress={() => router.back()}><Text style={styles.back}>‹</Text></Pressable>
      <View><Text style={styles.kicker}>JARVIS / CONTROL</Text><Text style={styles.title}>Tasks</Text></View>
    </View>
    <View style={styles.composer}>
      <TextInput value={title} onChangeText={setTitle} placeholder="Nowe zadanie…" placeholderTextColor="#6d7885" style={styles.input} onSubmitEditing={addTask} />
      <Pressable onPress={addTask} disabled={saving} style={styles.add}><Text style={styles.addText}>{saving ? '…' : '+'}</Text></Pressable>
    </View>
    {error ? <Text style={styles.error}>{error}</Text> : null}
    {loading ? <ActivityIndicator style={{ marginTop: 30 }} /> : <FlatList data={items} keyExtractor={(item, i) => String(item.id ?? i)} contentContainerStyle={styles.list} renderItem={({ item }) => <View style={styles.row}><View style={{ flex: 1 }}><Text style={styles.rowTitle}>{item.title ?? item.name ?? 'Bez nazwy'}</Text><Text style={styles.meta}>{item.status ?? 'pending'} · {item.priority ?? 'medium'}</Text></View></View>} ListEmptyComponent={<Text style={styles.empty}>Brak zadań.</Text>} />}
  </View>;
}

const styles = StyleSheet.create({ root:{flex:1,backgroundColor:bg,paddingTop:54}, header:{flexDirection:'row',alignItems:'center',paddingHorizontal:20,paddingBottom:18}, back:{fontSize:42,color:'#dce6f0',marginRight:14,lineHeight:42}, kicker:{fontSize:10,letterSpacing:2,color:'#657585'}, title:{fontSize:28,fontWeight:'700',color:'#f3f7fb'}, composer:{marginHorizontal:20,flexDirection:'row',backgroundColor:card,borderWidth:1,borderColor:line,borderRadius:14,padding:6}, input:{flex:1,color:'#fff',paddingHorizontal:12,fontSize:16}, add:{width:44,height:44,borderRadius:10,alignItems:'center',justifyContent:'center',backgroundColor:'#182635'},addText:{color:'#fff',fontSize:28},list:{padding:20,gap:10},row:{backgroundColor:card,borderColor:line,borderWidth:1,borderRadius:14,padding:16},rowTitle:{color:'#f1f5f9',fontSize:16,fontWeight:'600'},meta:{color:'#738191',marginTop:5,fontSize:12},empty:{color:'#657585',textAlign:'center',marginTop:30},error:{color:'#ff7b7b',paddingHorizontal:20,paddingTop:10,fontSize:12}}
