"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

type CatalogOption = { id: string; name: string };
type CatalogResult = { error: string | null; options: CatalogOption[] };
type CatalogCreateResult = { error: string | null; option: CatalogOption | null };

const nameSchema = z.string().trim().min(1).max(200);
const idSchema = z.uuid();

export async function searchSuppliersAction(query: unknown): Promise<CatalogResult> {
  const parsed = nameSchema.safeParse(query);
  if (!parsed.success) return { error: null, options: [] };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("search_suppliers", { query: parsed.data });
  if (error) return { error: "Scout could not search suppliers right now.", options: [] };
  return { error: null, options: data ?? [] };
}

export async function findOrCreateSupplierAction(name: unknown): Promise<CatalogCreateResult> {
  const parsed = nameSchema.safeParse(name);
  if (!parsed.success) return { error: "Enter a supplier name.", option: null };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("find_or_create_supplier", { supplier_name: parsed.data });
  if (error || !data?.[0]) return { error: "Scout could not add that supplier.", option: null };
  return { error: null, option: data[0] };
}

export async function searchDestinationsAction(query: unknown): Promise<CatalogResult> {
  const parsed = nameSchema.safeParse(query);
  if (!parsed.success) return { error: null, options: [] };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("search_destinations", { query: parsed.data });
  if (error) return { error: "Scout could not search destinations right now.", options: [] };
  return { error: null, options: data ?? [] };
}

export async function findOrCreateDestinationAction(name: unknown): Promise<CatalogCreateResult> {
  const parsed = nameSchema.safeParse(name);
  if (!parsed.success) return { error: "Enter a destination name.", option: null };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("find_or_create_destination", { destination_name: parsed.data });
  if (error || !data?.[0]) return { error: "Scout could not add that destination.", option: null };
  return { error: null, option: data[0] };
}

const supplierByDestinationSearchSchema = z.object({ destinationId: idSchema, query: nameSchema });
export async function searchSuppliersByDestinationAction(input: unknown): Promise<CatalogResult> {
  const parsed = supplierByDestinationSearchSchema.safeParse(input);
  if (!parsed.success) return { error: null, options: [] };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("search_suppliers", {
    destination_id: parsed.data.destinationId,
    query: parsed.data.query,
  });
  if (error) return { error: "Scout could not search suppliers right now.", options: [] };
  return { error: null, options: data ?? [] };
}

const supplierByDestinationCreateSchema = z.object({ destinationId: idSchema, name: nameSchema });
export async function findOrCreateSupplierByDestinationAction(input: unknown): Promise<CatalogCreateResult> {
  const parsed = supplierByDestinationCreateSchema.safeParse(input);
  if (!parsed.success) return { error: "Enter a supplier name.", option: null };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("find_or_create_supplier", {
    destination_id: parsed.data.destinationId,
    supplier_name: parsed.data.name,
  });
  if (error || !data?.[0]) return { error: "Scout could not add that supplier.", option: null };
  return { error: null, option: data[0] };
}

const propertySearchSchema = z.object({ supplierId: idSchema, query: nameSchema });
export async function searchSupplierPropertiesAction(input: unknown): Promise<CatalogResult> {
  const parsed = propertySearchSchema.safeParse(input);
  if (!parsed.success) return { error: null, options: [] };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("search_supplier_properties", {
    supplier_id: parsed.data.supplierId,
    query: parsed.data.query,
  });
  if (error) return { error: "Scout could not search properties right now.", options: [] };
  return { error: null, options: data ?? [] };
}

const propertyCreateSchema = z.object({ supplierId: idSchema, name: nameSchema });
export async function findOrCreateSupplierPropertyAction(input: unknown): Promise<CatalogCreateResult> {
  const parsed = propertyCreateSchema.safeParse(input);
  if (!parsed.success) return { error: "Enter a property name.", option: null };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("find_or_create_supplier_property", {
    supplier_id: parsed.data.supplierId,
    property_name: parsed.data.name,
  });
  if (error || !data?.[0]) return { error: "Scout could not add that property.", option: null };
  return { error: null, option: data[0] };
}

const roomOptionSearchSchema = z.object({ propertyId: idSchema, query: nameSchema });
export async function searchSupplierRoomOptionsAction(input: unknown): Promise<CatalogResult> {
  const parsed = roomOptionSearchSchema.safeParse(input);
  if (!parsed.success) return { error: null, options: [] };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("search_supplier_room_options", {
    property_id: parsed.data.propertyId,
    query: parsed.data.query,
  });
  if (error) return { error: "Scout could not search room options right now.", options: [] };
  return { error: null, options: data ?? [] };
}

const roomOptionCreateSchema = z.object({ propertyId: idSchema, name: nameSchema });
export async function findOrCreateSupplierRoomOptionAction(input: unknown): Promise<CatalogCreateResult> {
  const parsed = roomOptionCreateSchema.safeParse(input);
  if (!parsed.success) return { error: "Enter a room option name.", option: null };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("find_or_create_supplier_room_option", {
    property_id: parsed.data.propertyId,
    room_option_name: parsed.data.name,
  });
  if (error || !data?.[0]) return { error: "Scout could not add that room option.", option: null };
  return { error: null, option: data[0] };
}
