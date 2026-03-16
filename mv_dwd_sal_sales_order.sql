create materialized VIEW gacmotor_dw.mv_dwd_sal_sales_order
comment '订单明细DWD'
distributed by hash(so_no_id)
PARTITION BY date_trunc('year', part_dt)
refresh async START ('2024-08-01 00:00:00') EVERY (INTERVAL 30 MINUTE)
properties (
    "auto_refresh_partitions_limit" = "2",
    "enable_query_rewrite" = "false"
)
as
select
    tso.part_dt,
    tso.so_no_id,
    tso.so_no,
    -- 车维度
    tso.product_id,
    tvp.product_code,
    dp.is_newenergy_series,
    -- 门店信息
    if(dd.dealer_code is not null and tco.received_dealer_code is not null, tco.received_dealer_code, tso.dealer_code) as dealer_code,
    tso.dealer_code as dealer_code_original,
    if(dd.dealer_code is not null,1,0) AS is_tecom,
    -- 员工信息
    tso.consultant as consultant_employee_no,
    tso.sales_consultant as sales_consultant_employee_no,
    -- 订单相关编码
    tso.sales_vin as vin,
    tco.son_no,
    
    
    -- elook需求新增
    nmr.review_status, -- 审核状态
    nmr.change_type,-- 退改审核类型
    ifnull(tsi.invoice_date,tvro.invoice_date) as invoice_date,
    tco.customer_signed_time,
    tco.is_showcar_order,
    
    -- 跨模块id
    tso.customer_id,
    tso.vs_stock_id,
    tso.clue_record_id,
    tso.appointment_id,
    tso.twonet_id,
    -- 店端大客户编号
    tso.major_customer_code as major_customer_no,
    -- 属性和状态
    tso.so_status,
    tso.business_type,
    tso.order_type,
    if(tso.twonet_id is not null or tso.twonet_id = 10041001, 1, 0) as is_two_net,
    if(tso.is_bigcustomer_order = 10041001 or (dp.is_newenergy_series = 1 and tco.car_buy_type = 2), 1, 0) as is_bigcustomer_order,
    tso.origin_order_no,
    -- 剩余订单
    if(tso.business_type = 14031001
        and tso.so_status IN ( 14041001, 14041002, 14041005, 14041008, 14041004, 14041007, 14041014, 14041015 )
        and tso.cancel_date is null
        and tvro.report_date is null, 1, 0) as is_remain_order,
    tso.remain_order,
    -- APP订单信息
    tco.deposit,
    tco.order_bargain_status,
    tco.order_no_iext,
    tco.car_buy_type,
    tco.received_dealer_code,
    tco.submit_dealer_code,
    tco.dealer_code as tco_dealer_code,
    if(
        tso.dealer_code = 'DSHA140'
        or tso.mobile_phone in (18613118897 , 13631267594 , 13802881251 , 18928549871 , 13512751868,13826145098)
        or tco.deposit = 0
        or tco.received_dealer_code = 'DSHA140'
        or mod(tco.deposit, 1) > 0 , 1, 0
    ) as is_test,
    -- 终端信息
    tvro.vin as actual_sales_report_vin,
    tvro.invoice_sources,
    tvro.record_status,
    tvro.report_date,
    tvro.return_date,
    tvro.rs_order_id,
    -- 客户信息
    tso.customer_no,
    tso.customer_name,
    tso.mobile_phone,
    -- 日期时间
    ifnull(tso.first_commit_time, tso.commit_time) as commit_time,
    tso.cancel_date as cancel_time,
    tco.audit_at_dd as rechange_audit_time,
    tso.sheet_create_date,
    tso.created_at,
    tso.updated_at
from cdc_g063_grt_all_db.tt_sales_order tso
left join cdc_g063_grt_all_db.tt_vs_release_order tvro on tso.so_no_id = tvro.so_no_id and tso.so_no = tvro.so_no and tvro.dr = 0 -- 保证唯一
left join (select so_no_id,max(invoice_date) as invoice_date from cdc_g063_grt_all_db.tt_so_invoice where is_valid=10041001 and is_real_report=10041001 group by so_no_id) tsi on tso.so_no_id = tsi.so_no_id  
left join cdc_g063_grt_all_db.tm_vs_product tvp on tso.product_id = tvp.product_id
left join (
    select
        tco.*, osi.car_buy_type, tor.audit_at_dd
    from (
        select
            dealer_code,order_no_iext, son_no, order_no, order_bargain_status, null as deposit, null as received_dealer_code, null as submit_dealer_code,null as customer_signed_time,null as is_showcar_order
        from cdc_g063_grt_all_db.tt_customized_order
        union all
        select
            dealer_code, order_no_iext, son_no, order_no, order_bargain_status, deposit, received_dealer_code, submit_dealer_code,customer_signed_time,is_showcar_order
        from (
            select
              dealer_code, order_no_iext, son_no, order_no, order_bargain_status, deposit, received_dealer_code, submit_dealer_code,customer_signed_time,is_showcar_order,
              row_number() over(partition by order_no order by if(instr(order_no_iext, 'R')=0,1,2)) as rnk
        from cdc_g063_grt_all_db.tt_customized_m9_order
        ) t where t.rnk = 1
    ) tco
    left join cdc_g063_online_mall.order_schedule_info osi on osi.order_no = substr(tco.order_no_iext, 1, 12)
    -- 退改表门店审核时间
    left join (
        select
            order_no_iext,audit_at_dd, row_number() over (partition by order_no_iext order by created_at) as rnk
        from cdc_g063_grt_all_db.tt_customized_order_rechange
        where dr = 0
    ) tor on tor.order_no_iext = tco.order_no_iext and tor.rnk = 1
) tco on tso.so_no=tco.order_no
-- 创新营销审核
left join cdc_g063_grt_all_db.tt_newsales_modify_review nmr on tco.order_no_iext=nmr.order_no_iext and nmr.is_latest_data = 10041001 and nmr.time_deleted = 0
LEFT JOIN gacmotor_dim.mv_dim_dealer dd on tso.dealer_code = dd.dealer_code  AND dd.is_tecom_dealer=1
LEFT JOIN gacmotor_dim.mv_dim_product dp on tvp.product_code= dp.product_code