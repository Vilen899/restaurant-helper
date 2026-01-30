export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      audit_log: {
        Row: {
          action: string
          created_at: string
          id: string
          ip_address: string | null
          new_data: Json | null
          old_data: Json | null
          record_id: string
          table_name: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          record_id: string
          table_name: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string
          table_name?: string
          user_id?: string | null
        }
        Relationships: []
      }
      discounts: {
        Row: {
          created_at: string
          discount_type: string
          id: string
          is_active: boolean
          name: string
          sort_order: number
          updated_at: string
          value: number
        }
        Insert: {
          created_at?: string
          discount_type?: string
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
          updated_at?: string
          value?: number
        }
        Update: {
          created_at?: string
          discount_type?: string
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
          updated_at?: string
          value?: number
        }
        Relationships: []
      }
      fiscal_settings: {
        Row: {
          api_login: string | null
          api_password: string | null
          api_token: string | null
          api_url: string | null
          auto_print_receipt: boolean
          company_address: string | null
          company_name: string | null
          connection_type: string
          created_at: string
          default_timeout: number | null
          device_id: string | null
          driver: string
          enabled: boolean
          id: string
          inn: string | null
          ip_address: string | null
          kkm_password: string | null
          location_id: string | null
          operator_name: string | null
          payment_timeout: number | null
          port: string | null
          print_copy: boolean
          serial_number: string | null
          terminal_id: string | null
          updated_at: string
          vat_rate: number | null
        }
        Insert: {
          api_login?: string | null
          api_password?: string | null
          api_token?: string | null
          api_url?: string | null
          auto_print_receipt?: boolean
          company_address?: string | null
          company_name?: string | null
          connection_type?: string
          created_at?: string
          default_timeout?: number | null
          device_id?: string | null
          driver?: string
          enabled?: boolean
          id?: string
          inn?: string | null
          ip_address?: string | null
          kkm_password?: string | null
          location_id?: string | null
          operator_name?: string | null
          payment_timeout?: number | null
          port?: string | null
          print_copy?: boolean
          serial_number?: string | null
          terminal_id?: string | null
          updated_at?: string
          vat_rate?: number | null
        }
        Update: {
          api_login?: string | null
          api_password?: string | null
          api_token?: string | null
          api_url?: string | null
          auto_print_receipt?: boolean
          company_address?: string | null
          company_name?: string | null
          connection_type?: string
          created_at?: string
          default_timeout?: number | null
          device_id?: string | null
          driver?: string
          enabled?: boolean
          id?: string
          inn?: string | null
          ip_address?: string | null
          kkm_password?: string | null
          location_id?: string | null
          operator_name?: string | null
          payment_timeout?: number | null
          port?: string | null
          print_copy?: boolean
          serial_number?: string | null
          terminal_id?: string | null
          updated_at?: string
          vat_rate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fiscal_settings_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: true
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      ingredients: {
        Row: {
          cost_per_unit: number
          created_at: string
          id: string
          is_active: boolean
          min_stock: number | null
          name: string
          unit_id: string
          updated_at: string
        }
        Insert: {
          cost_per_unit?: number
          created_at?: string
          id?: string
          is_active?: boolean
          min_stock?: number | null
          name: string
          unit_id: string
          updated_at?: string
        }
        Update: {
          cost_per_unit?: number
          created_at?: string
          id?: string
          is_active?: boolean
          min_stock?: number | null
          name?: string
          unit_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ingredients_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory: {
        Row: {
          id: string
          ingredient_id: string
          location_id: string
          quantity: number
          updated_at: string
        }
        Insert: {
          id?: string
          ingredient_id: string
          location_id: string
          quantity?: number
          updated_at?: string
        }
        Update: {
          id?: string
          ingredient_id?: string
          location_id?: string
          quantity?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_movements: {
        Row: {
          cost_per_unit: number | null
          created_at: string
          created_by: string | null
          id: string
          ingredient_id: string
          location_id: string
          movement_type: Database["public"]["Enums"]["movement_type"]
          notes: string | null
          quantity: number
          reference_id: string | null
        }
        Insert: {
          cost_per_unit?: number | null
          created_at?: string
          created_by?: string | null
          id?: string
          ingredient_id: string
          location_id: string
          movement_type: Database["public"]["Enums"]["movement_type"]
          notes?: string | null
          quantity: number
          reference_id?: string | null
        }
        Update: {
          cost_per_unit?: number | null
          created_at?: string
          created_by?: string | null
          id?: string
          ingredient_id?: string
          location_id?: string
          movement_type?: Database["public"]["Enums"]["movement_type"]
          notes?: string | null
          quantity?: number
          reference_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_movements_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      locations: {
        Row: {
          address: string | null
          created_at: string
          id: string
          is_active: boolean
          name: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      material_document_items: {
        Row: {
          doc_id: string | null
          id: string
          ingredient_id: string | null
          price: number | null
          quantity: number
        }
        Insert: {
          doc_id?: string | null
          id?: string
          ingredient_id?: string | null
          price?: number | null
          quantity: number
        }
        Update: {
          doc_id?: string | null
          id?: string
          ingredient_id?: string | null
          price?: number | null
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "material_document_items_doc_id_fkey"
            columns: ["doc_id"]
            isOneToOne: false
            referencedRelation: "material_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_document_items_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
        ]
      }
      material_documents: {
        Row: {
          created_at: string | null
          description: string | null
          doc_number: string | null
          id: string
          location_id: string | null
          supplier_name: string | null
          total_amount: number | null
          type: string
          vendor_inn: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          doc_number?: string | null
          id?: string
          location_id?: string | null
          supplier_name?: string | null
          total_amount?: number | null
          type: string
          vendor_inn?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          doc_number?: string | null
          id?: string
          location_id?: string | null
          supplier_name?: string | null
          total_amount?: number | null
          type?: string
          vendor_inn?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "material_documents_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_categories: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      menu_item_ingredients: {
        Row: {
          created_at: string
          id: string
          ingredient_id: string | null
          menu_item_id: string
          quantity: number
          semi_finished_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          ingredient_id?: string | null
          menu_item_id: string
          quantity: number
          semi_finished_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          ingredient_id?: string | null
          menu_item_id?: string
          quantity?: number
          semi_finished_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "menu_item_ingredients_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_item_ingredients_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_item_ingredients_semi_finished_id_fkey"
            columns: ["semi_finished_id"]
            isOneToOne: false
            referencedRelation: "semi_finished"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_items: {
        Row: {
          category_id: string
          cost_price: number
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          output_weight: number | null
          price: number
          sort_order: number
          updated_at: string
        }
        Insert: {
          category_id: string
          cost_price?: number
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          output_weight?: number | null
          price: number
          sort_order?: number
          updated_at?: string
        }
        Update: {
          category_id?: string
          cost_price?: number
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          output_weight?: number | null
          price?: number
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "menu_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          menu_item_id: string
          notes: string | null
          order_id: string
          quantity: number
          total_price: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          menu_item_id: string
          notes?: string | null
          order_id: string
          quantity?: number
          total_price: number
          unit_price: number
        }
        Update: {
          created_at?: string
          id?: string
          menu_item_id?: string
          notes?: string | null
          order_id?: string
          quantity?: number
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          completed_at: string | null
          created_at: string
          created_by: string | null
          discount: number
          discount_id: string | null
          discount_name: string | null
          discount_reason: string | null
          discount_type: string | null
          discount_value: number | null
          id: string
          location_id: string
          notes: string | null
          order_number: number
          payment_method: string | null
          status: Database["public"]["Enums"]["order_status"]
          subtotal: number
          total: number
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          discount?: number
          discount_id?: string | null
          discount_name?: string | null
          discount_reason?: string | null
          discount_type?: string | null
          discount_value?: number | null
          id?: string
          location_id: string
          notes?: string | null
          order_number?: number
          payment_method?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          total?: number
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          discount?: number
          discount_id?: string | null
          discount_name?: string | null
          discount_reason?: string | null
          discount_type?: string | null
          discount_value?: number | null
          id?: string
          location_id?: string
          notes?: string | null
          order_number?: number
          payment_method?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "orders_discount_id_fkey"
            columns: ["discount_id"]
            isOneToOne: false
            referencedRelation: "discounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_methods: {
        Row: {
          code: string
          created_at: string
          icon: string | null
          id: string
          is_active: boolean
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          icon?: string | null
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          icon?: string | null
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string
          hourly_rate: number | null
          id: string
          is_active: boolean
          location_id: string | null
          phone: string | null
          pin_hash: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          full_name: string
          hourly_rate?: number | null
          id: string
          is_active?: boolean
          location_id?: string | null
          phone?: string | null
          pin_hash?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          full_name?: string
          hourly_rate?: number | null
          id?: string
          is_active?: boolean
          location_id?: string | null
          phone?: string | null
          pin_hash?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      semi_finished: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          output_quantity: number
          unit_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          output_quantity?: number
          unit_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          output_quantity?: number
          unit_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "semi_finished_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      semi_finished_ingredients: {
        Row: {
          created_at: string
          id: string
          ingredient_id: string | null
          quantity: number
          semi_finished_component_id: string | null
          semi_finished_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          ingredient_id?: string | null
          quantity: number
          semi_finished_component_id?: string | null
          semi_finished_id: string
        }
        Update: {
          created_at?: string
          id?: string
          ingredient_id?: string | null
          quantity?: number
          semi_finished_component_id?: string | null
          semi_finished_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "semi_finished_ingredients_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "semi_finished_ingredients_semi_finished_component_id_fkey"
            columns: ["semi_finished_component_id"]
            isOneToOne: false
            referencedRelation: "semi_finished"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "semi_finished_ingredients_semi_finished_id_fkey"
            columns: ["semi_finished_id"]
            isOneToOne: false
            referencedRelation: "semi_finished"
            referencedColumns: ["id"]
          },
        ]
      }
      shifts: {
        Row: {
          break_minutes: number | null
          created_at: string
          ended_at: string | null
          id: string
          location_id: string
          notes: string | null
          started_at: string
          user_id: string
        }
        Insert: {
          break_minutes?: number | null
          created_at?: string
          ended_at?: string | null
          id?: string
          location_id: string
          notes?: string | null
          started_at?: string
          user_id: string
        }
        Update: {
          break_minutes?: number | null
          created_at?: string
          ended_at?: string | null
          id?: string
          location_id?: string
          notes?: string | null
          started_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shifts_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_movements: {
        Row: {
          created_at: string | null
          id: string
          ingredient_id: string | null
          location_id: string | null
          quantity: number
          reference: string | null
          type: string
          vendor_inn: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          ingredient_id?: string | null
          location_id?: string | null
          quantity: number
          reference?: string | null
          type: string
          vendor_inn?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          ingredient_id?: string | null
          location_id?: string | null
          quantity?: number
          reference?: string | null
          type?: string
          vendor_inn?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      stocktaking_items: {
        Row: {
          actual_quantity: number
          created_at: string
          difference: number
          id: string
          ingredient_id: string
          stocktaking_id: string
          system_quantity: number
        }
        Insert: {
          actual_quantity: number
          created_at?: string
          difference: number
          id?: string
          ingredient_id: string
          stocktaking_id: string
          system_quantity: number
        }
        Update: {
          actual_quantity?: number
          created_at?: string
          difference?: number
          id?: string
          ingredient_id?: string
          stocktaking_id?: string
          system_quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "stocktaking_items_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stocktaking_items_stocktaking_id_fkey"
            columns: ["stocktaking_id"]
            isOneToOne: false
            referencedRelation: "stocktakings"
            referencedColumns: ["id"]
          },
        ]
      }
      stocktakings: {
        Row: {
          completed_at: string | null
          created_at: string
          created_by: string | null
          id: string
          items_with_difference: number
          location_id: string
          notes: string | null
          shortage_count: number
          status: string
          surplus_count: number
          total_items: number
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          items_with_difference?: number
          location_id: string
          notes?: string | null
          shortage_count?: number
          status?: string
          surplus_count?: number
          total_items?: number
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          items_with_difference?: number
          location_id?: string
          notes?: string | null
          shortage_count?: number
          status?: string
          surplus_count?: number
          total_items?: number
        }
        Relationships: [
          {
            foreignKeyName: "stocktakings_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      supplies: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          invoice_number: string | null
          location_id: string
          received_at: string | null
          received_by: string | null
          status: Database["public"]["Enums"]["supply_status"]
          supplier_name: string | null
          total_amount: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          invoice_number?: string | null
          location_id: string
          received_at?: string | null
          received_by?: string | null
          status?: Database["public"]["Enums"]["supply_status"]
          supplier_name?: string | null
          total_amount?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          invoice_number?: string | null
          location_id?: string
          received_at?: string | null
          received_by?: string | null
          status?: Database["public"]["Enums"]["supply_status"]
          supplier_name?: string | null
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplies_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      supply_items: {
        Row: {
          cost_per_unit: number
          created_at: string
          id: string
          ingredient_id: string
          quantity: number
          supply_id: string
          total_cost: number
        }
        Insert: {
          cost_per_unit: number
          created_at?: string
          id?: string
          ingredient_id: string
          quantity: number
          supply_id: string
          total_cost: number
        }
        Update: {
          cost_per_unit?: number
          created_at?: string
          id?: string
          ingredient_id?: string
          quantity?: number
          supply_id?: string
          total_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "supply_items_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supply_items_supply_id_fkey"
            columns: ["supply_id"]
            isOneToOne: false
            referencedRelation: "supplies"
            referencedColumns: ["id"]
          },
        ]
      }
      transfer_items: {
        Row: {
          created_at: string
          id: string
          ingredient_id: string
          quantity: number
          transfer_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          ingredient_id: string
          quantity: number
          transfer_id: string
        }
        Update: {
          created_at?: string
          id?: string
          ingredient_id?: string
          quantity?: number
          transfer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transfer_items_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfer_items_transfer_id_fkey"
            columns: ["transfer_id"]
            isOneToOne: false
            referencedRelation: "transfers"
            referencedColumns: ["id"]
          },
        ]
      }
      transfers: {
        Row: {
          completed_at: string | null
          completed_by: string | null
          created_at: string
          created_by: string | null
          from_location_id: string
          id: string
          notes: string | null
          status: Database["public"]["Enums"]["transfer_status"]
          to_location_id: string
        }
        Insert: {
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          created_by?: string | null
          from_location_id: string
          id?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["transfer_status"]
          to_location_id: string
        }
        Update: {
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          created_by?: string | null
          from_location_id?: string
          id?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["transfer_status"]
          to_location_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transfers_from_location_id_fkey"
            columns: ["from_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfers_to_location_id_fkey"
            columns: ["to_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      units: {
        Row: {
          abbreviation: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          abbreviation: string
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          abbreviation?: string
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_location: { Args: { _user_id: string }; Returns: string }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_inventory: {
        Args: { ing_id: string; loc_id: string; val: number }
        Returns: undefined
      }
      is_admin_or_manager: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "manager" | "cashier"
      movement_type:
        | "sale"
        | "supply"
        | "transfer_in"
        | "transfer_out"
        | "write_off"
        | "adjustment"
      order_status:
        | "pending"
        | "preparing"
        | "ready"
        | "completed"
        | "cancelled"
      supply_status: "pending" | "received" | "cancelled"
      transfer_status: "pending" | "in_transit" | "completed" | "cancelled"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "manager", "cashier"],
      movement_type: [
        "sale",
        "supply",
        "transfer_in",
        "transfer_out",
        "write_off",
        "adjustment",
      ],
      order_status: ["pending", "preparing", "ready", "completed", "cancelled"],
      supply_status: ["pending", "received", "cancelled"],
      transfer_status: ["pending", "in_transit", "completed", "cancelled"],
    },
  },
} as const
